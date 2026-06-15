/**
 * @fileoverview Session management for the auth proxy.
 * - Sessions are opaque random IDs (32 bytes hex).
 * - Stored in KV under `session:<sid>` with a metadata blob.
 * - Delivered to the browser as the `invsess` cookie.
 */

const COOKIE_NAME = 'invsess';
const STATE_COOKIE = 'invstate';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, sliding

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < arr.length; i += 1) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function newSessionId() {
  return randomHex(32);
}

export function newState() {
  return randomHex(24);
}

/**
 * Persist a session in KV.
 * @param {KVNamespace} kv
 * @param {string} sid
 * @param {object} metadata
 */
export async function putSession(kv, sid, metadata) {
  await kv.put(
    `session:${sid}`,
    JSON.stringify({ ...metadata, createdAt: new Date().toISOString() }),
    { expirationTtl: SESSION_TTL_SECONDS },
  );
}

export async function getSession(kv, sid) {
  if (!sid) return null;
  const raw = await kv.get(`session:${sid}`, 'json');
  return raw || null;
}

export async function deleteSession(kv, sid) {
  if (!sid) return;
  await kv.delete(`session:${sid}`);
}

/**
 * Build a Set-Cookie value with the correct security flags.
 * @param {string} sid
 * @param {boolean} secure
 * @returns {string}
 */
export function sessionCookie(sid, secure) {
  const flags = [
    `${COOKIE_NAME}=${sid}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

export function clearSessionCookie(secure) {
  const flags = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

export function stateCookie(state, secure) {
  const flags = [
    `${STATE_COOKIE}=${state}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
  ];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

export function clearStateCookie(secure) {
  const flags = [`${STATE_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

/**
 * Parse the session cookie out of a request.
 * @param {Request} request
 * @returns {string}
 */
export function readSessionId(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  for (const part of cookieHeader.split(/;\s*/)) {
    const [k, v] = part.split('=');
    if (k === COOKIE_NAME && v) return v;
  }
  return '';
}

export function readState(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  for (const part of cookieHeader.split(/;\s*/)) {
    const [k, v] = part.split('=');
    if (k === STATE_COOKIE && v) return v;
  }
  return '';
}

export const _internals = { COOKIE_NAME, STATE_COOKIE, SESSION_TTL_SECONDS };
