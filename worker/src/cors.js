/**
 * @fileoverview CORS gate. Only the configured origin may call the API.
 * Echoes the allowed origin for credentialed requests (browsers reject
 * the literal "*" with credentials: 'include').
 */

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';

/**
 * @param {Request} request
 * @param {string} allowedOrigin
 * @returns {Headers}
 */
export function corsHeaders(request, allowedOrigin) {
  const headers = new Headers();
  const origin = request.headers.get('Origin');
  if (origin && origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
    headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  }
  return headers;
}

/**
 * Handle a CORS preflight. Returns null if not a preflight.
 * @param {Request} request
 * @param {string} allowedOrigin
 * @returns {Response | null}
 */
export function handlePreflight(request, allowedOrigin) {
  if (request.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders(request, allowedOrigin) });
}

/**
 * Returns true if the request origin is allowed. Requests without an
 * Origin header (curl, server-to-server) are rejected unless explicitly
 * allowed via env.override.
 */
export function isOriginAllowed(request, allowedOrigin) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return origin === allowedOrigin;
}
