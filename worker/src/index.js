/**
 * @fileoverview Worker entry point. Routes requests to handlers and
 * applies the CORS gate uniformly.
 */

import { handlePreflight, isOriginAllowed, corsHeaders } from './cors.js';
import { allowedOrigin as readAllowedOrigin, requiredSecret } from './env.js';
import { handleAuthCallback } from './handlers/auth-callback.js';
import { handleAuthMe } from './handlers/auth-me.js';
import { handleToken } from './handlers/token.js';
import { handleSignout } from './handlers/signout.js';
import { handleHealth } from './handlers/health.js';
import { handleInstall } from './handlers/install.js';

function jsonResponse(body, init, request, allowedOrigin) {
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  for (const [k, v] of corsHeaders(request, allowedOrigin).entries()) {
    headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

function errorResponse(message, status, request, allowedOrigin) {
  return jsonResponse({ error: message }, { status }, request, allowedOrigin);
}

export default {
  /**
   * @param {Request} request
   * @param {Record<string, unknown>} env
   */
  async fetch(request, env, ctx) {
    const origin = readAllowedOrigin(env);
    const preflight = handlePreflight(request, origin);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // Public routes: install (browser redirect) + health.
    if (path === '/auth/install' && request.method === 'GET') {
      try {
        const clientId = requiredSecret(env, 'GITHUB_APP_CLIENT_ID');
        return handleInstall(request, url, origin, clientId);
      } catch (e) {
        return errorResponse(e.message || 'install_failed', 500, request, origin);
      }
    }
    if (path === '/health' && request.method === 'GET') {
      return handleHealth(env, request, origin);
    }

    // Everything else requires the browser's Origin to match ALLOWED_ORIGIN.
    if (!isOriginAllowed(request, origin)) {
      return errorResponse('origin_not_allowed', 403, request, origin);
    }

    try {
      if (path === '/auth/callback' && request.method === 'POST') {
        return await handleAuthCallback(request, env, origin, url, ctx);
      }
      if (path === '/auth/me' && request.method === 'GET') {
        return await handleAuthMe(request, env, origin);
      }
      if (path === '/token' && request.method === 'GET') {
        return await handleToken(request, env, origin);
      }
      if (path === '/auth/signout' && request.method === 'POST') {
        return await handleSignout(request, env, origin);
      }
    } catch (e) {
      const status = e?.status || 500;
      const message = e?.message || 'internal_error';
      return errorResponse(message, status, request, origin);
    }

    return errorResponse('not_found', 404, request, origin);
  },
};
