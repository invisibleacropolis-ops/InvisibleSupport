/**
 * @fileoverview GitHub App JWT signing + installation access token mint/refresh.
 * Implements the GitHub App auth flow:
 *   1. Sign a short-lived RS256 JWT using the App's private key.
 *   2. Exchange the JWT for an installation access token via the REST API.
 *   3. Cache the token in KV with a TTL = expires_at - 60s.
 *   4. Re-mint when the cached token is missing or within 60s of expiry.
 */

const APP_JWT_TTL_SECONDS = 10 * 60;
const APP_JWT_CLOCK_SKEW_SECONDS = 60;
const INSTALL_TOKEN_TTL_SAFETY_MS = 60_000;

const textEncoder = new TextEncoder();

/**
 * Base64url-encode a buffer or string.
 * @param {ArrayBuffer | Uint8Array} data
 * @returns {string}
 */
function base64url(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Strip PEM headers/footers and decode to raw bytes (PKCS#8).
 * Accepts PKCS#1 ("RSA PRIVATE KEY") and PKCS#8 ("PRIVATE KEY") formats.
 * @param {string} pem
 * @returns {ArrayBuffer}
 */
function pemToBuffer(pem) {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Imports the App's private key. Caches the CryptoKey on the env object
 * so we don't pay the import cost on every request.
 * @param {string} pem
 * @param {Record<string, unknown>} [cache]
 * @returns {Promise<CryptoKey>}
 */
export async function importPrivateKey(pem, cache) {
  if (cache && cache.__appPrivateKey instanceof CryptoKey) {
    return cache.__appPrivateKey;
  }
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  if (cache) cache.__appPrivateKey = key;
  return key;
}

/**
 * Signs a GitHub App JWT for use as a Bearer token on
 * `https://api.github.com/app/installations/.../access_tokens` and
 * other `/app` endpoints.
 * @param {string} appId
 * @param {CryptoKey} privateKey
 * @param {number} [nowMs=Date.now()]
 * @returns {Promise<string>}
 */
export async function signAppJwt(appId, privateKey, nowMs = Date.now()) {
  const iat = Math.floor(nowMs / 1000) - APP_JWT_CLOCK_SKEW_SECONDS;
  const exp = iat + APP_JWT_TTL_SECONDS;
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat, exp, iss: appId };
  const headerEnc = base64url(textEncoder.encode(JSON.stringify(header)));
  const payloadEnc = base64url(textEncoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerEnc}.${payloadEnc}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    textEncoder.encode(signingInput),
  );
  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Mints a new installation access token.
 * @param {string} installationId
 * @param {string} appId
 * @param {string} privateKeyPem
 * @param {Record<string, unknown>} [cache]
 * @returns {Promise<{ token: string, expiresAt: string, permissions: Record<string, string>, repository: { full_name: string } | null }>}
 */
export async function mintInstallationToken(installationId, appId, privateKeyPem, cache) {
  const key = await importPrivateKey(privateKeyPem, cache);
  const jwt = await signAppJwt(appId, key);
  const res = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'invisible-support-portal-worker',
      },
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub token mint failed (${res.status}): ${text}`);
  }
  const body = await res.json();
  if (!body?.token || !body?.expires_at) {
    throw new Error('GitHub token mint returned an unexpected payload');
  }
  return {
    token: body.token,
    expiresAt: body.expires_at,
    permissions: body.permissions || {},
    repository: body.repository || null,
  };
}

/**
 * Returns a non-expired installation token, minting one if needed.
 * @param {KVNamespace} kv
 * @param {string} installationId
 * @param {string} appId
 * @param {string} privateKeyPem
 * @param {Record<string, unknown>} [cache]
 * @param {number} [nowMs=Date.now()]
 * @returns {Promise<{ token: string, expiresAt: string }>}
 */
export async function getOrMintInstallationToken(kv, installationId, appId, privateKeyPem, cache, nowMs = Date.now()) {
  const key = `install:${installationId}`;
  const cached = await kv.get(key, 'json');
  if (cached && typeof cached === 'object' && typeof cached.token === 'string' && typeof cached.expiresAt === 'string') {
    const expiresMs = Date.parse(cached.expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs - nowMs > INSTALL_TOKEN_TTL_SAFETY_MS) {
      return { token: cached.token, expiresAt: cached.expiresAt };
    }
  }
  const fresh = await mintInstallationToken(installationId, appId, privateKeyPem, cache);
  const expiresMs = Date.parse(fresh.expiresAt);
  const ttlSeconds = Math.max(60, Math.floor((expiresMs - nowMs) / 1000) - 60);
  await kv.put(
    key,
    JSON.stringify({
      token: fresh.token,
      expiresAt: fresh.expiresAt,
      permissions: fresh.permissions,
      repository: fresh.repository,
    }),
    { expirationTtl: ttlSeconds },
  );
  return { token: fresh.token, expiresAt: fresh.expiresAt };
}

export const _internals = {
  base64url,
  pemToBuffer,
  APP_JWT_TTL_SECONDS,
  APP_JWT_CLOCK_SKEW_SECONDS,
  INSTALL_TOKEN_TTL_SAFETY_MS,
};
