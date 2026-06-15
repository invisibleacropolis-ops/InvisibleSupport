/**
 * @fileoverview `GET /auth/me` — returns the current session's account/repo.
 */

import { readSessionId, getSession } from '../session.js';
import { corsHeaders } from '../cors.js';

export async function handleAuthMe(request, env, allowedOrigin) {
  const sid = readSessionId(request);
  const session = await getSession(env.INSTALLATIONS, sid);
  if (!session) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: withCors({ 'Content-Type': 'application/json' }, request, allowedOrigin),
    });
  }
  const body = {
    account: session.account,
    repo: session.repo,
    installationId: session.installationId,
    installedAt: session.createdAt,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: withCors({ 'Content-Type': 'application/json' }, request, allowedOrigin),
  });
}

function withCors(headers, request, allowedOrigin) {
  const out = new Headers(headers);
  for (const [k, v] of corsHeaders(request, allowedOrigin).entries()) {
    out.set(k, v);
  }
  return out;
}
