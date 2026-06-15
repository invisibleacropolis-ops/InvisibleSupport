/**
 * @fileoverview `POST /auth/callback`
 * Body: `{ code?, installation_id, state, repositories? }`
 *
 * The browser posts the data it gathered from GitHub's install-redirect
 * (which is the only way the GitHub App user-to-server flow returns
 * installation metadata in a static-app context). We verify the `state`
 * matches the cookie, then mint a session, store the install metadata
 * in KV, and set the session cookie.
 */

import { newSessionId, putSession, sessionCookie, readState, clearStateCookie } from '../session.js';
import { requiredSecret } from '../env.js';
import { mintInstallationToken } from '../github.js';

function json(body, init, extraHeaders) {
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function handleAuthCallback(request, env, allowedOrigin, url, ctx) {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  const installationId = String(payload.installation_id || '').trim();
  const state = String(payload.state || '').trim();
  if (!installationId) {
    return json({ error: 'missing_installation_id' }, { status: 400 });
  }
  if (!state) {
    return json({ error: 'missing_state' }, { status: 400 });
  }
  const expectedState = readState(request);
  if (!expectedState || expectedState !== state) {
    return json({ error: 'state_mismatch' }, { status: 400 });
  }

  const appId = requiredSecret(env, 'GITHUB_APP_ID');
  const privateKeyPem = requiredSecret(env, 'GITHUB_APP_PRIVATE_KEY');

  // Mint once eagerly to validate the installation and capture repository info.
  const initial = await mintInstallationToken(installationId, appId, privateKeyPem, ctx);

  const repoFullName = initial.repository?.full_name || '';
  const [account = '', repo = ''] = repoFullName.split('/');
  const sid = newSessionId();
  await putSession(env.INSTALLATIONS, sid, {
    installationId,
    account,
    repo,
    permissions: initial.permissions,
    token: initial.token,
    expiresAt: initial.expiresAt,
  });
  // Also write to install:<id> so /token can find a cached token.
  await env.INSTALLATIONS.put(
    `install:${installationId}`,
    JSON.stringify({
      token: initial.token,
      expiresAt: initial.expiresAt,
      permissions: initial.permissions,
      repository: initial.repository || null,
    }),
    { expirationTtl: 3500 },
  );

  const isSecure = new URL(request.url).protocol === 'https:';
  return json(
    { account, repo, installedAt: new Date().toISOString() },
    { status: 200 },
    { 'Set-Cookie': sessionCookie(sid, isSecure) },
  );
}
