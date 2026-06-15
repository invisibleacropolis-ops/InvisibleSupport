/**
 * @fileoverview `GET /health` — liveness probe for uptime checks.
 */

import { corsHeaders } from '../cors.js';

export function handleHealth(env, request, allowedOrigin) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const [k, v] of corsHeaders(request, allowedOrigin).entries()) {
    headers.set(k, v);
  }
  return new Response(
    JSON.stringify({ ok: true, kv: env.INSTALLATIONS ? 'ok' : 'missing' }),
    { status: 200, headers },
  );
}
