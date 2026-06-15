/**
 * @fileoverview `GET /token` — returns a non-expired installation access token
 * for the current session. The browser calls this on every REST request
 * that needs GitHub authentication.
 */

import { readSessionId, getSession } from '../session.js';
import { corsHeaders } from '../cors.js';
import { requiredSecret } from '../env.js';
import { getOrMintInstallationToken } from '../github.js';

export async function handleToken(request, env, allowedOrigin, ctx) {
  const sid = readSessionId(request);
  const session = await getSession(env.INSTALLATIONS, sid);
  if (!session?.installationId) {
    return jsonResponse({ error: 'unauthorized' }, 401, request, allowedOrigin);
  }

  const appId = requiredSecret(env, 'GITHUB_APP_ID');
  const privateKeyPem = requiredSecret(env, 'GITHUB_APP_PRIVATE_KEY');

  try {
    const { token, expiresAt } = await getOrMintInstallationToken(
      env.INSTALLATIONS,
      session.installationId,
      appId,
      privateKeyPem,
      ctx,
    );
    return jsonResponse({ token, expiresAt }, 200, request, allowedOrigin);
  } catch (e) {
    return jsonResponse({ error: 'mint_failed', detail: e.message }, 502, request, allowedOrigin);
  }
}

function jsonResponse(body, status, request, allowedOrigin) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const [k, v] of corsHeaders(request, allowedOrigin).entries()) {
    headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { status, headers });
}
