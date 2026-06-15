/**
 * @fileoverview `POST /auth/signout` — clears the session and KV entry.
 */

import { readSessionId, deleteSession, clearSessionCookie } from '../session.js';
import { corsHeaders } from '../cors.js';

export async function handleSignout(request, env, allowedOrigin) {
  const sid = readSessionId(request);
  if (sid) {
    await deleteSession(env.INSTALLATIONS, sid);
  }
  const isSecure = new URL(request.url).protocol === 'https:';
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const [k, v] of corsHeaders(request, allowedOrigin).entries()) {
    headers.set(k, v);
  }
  headers.set('Set-Cookie', clearSessionCookie(isSecure));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
