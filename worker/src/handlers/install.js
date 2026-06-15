/**
 * @fileoverview `GET /auth/install`
 * Redirects the browser to GitHub's App install flow. The App is configured
 * to be installable on a single account; if it's already installed, the
 * App's "install" page prompts the user to choose which repos it has access to.
 *
 * Generates a CSRF `state` value, sets it in a short-lived cookie, and
 * includes it in the redirect so `/auth/callback` can verify it.
 */

import { newState, stateCookie } from '../session.js';

export function handleInstall(request, url, allowedOrigin, clientId) {
  const state = newState();
  const installationHint = url.searchParams.get('installation_id') || '';
  const stateWithHint = installationHint ? `${state}.${installationHint}` : state;
  const appSlugParam = url.searchParams.get('app_slug');
  const target = appSlugParam
    ? `https://github.com/apps/${encodeURIComponent(appSlugParam)}/installations/new?state=${encodeURIComponent(stateWithHint)}`
    : `https://github.com/apps/${encodeURIComponent(clientId)}/installations/new?state=${encodeURIComponent(stateWithHint)}`;
  const headers = new Headers({ Location: target });
  const isSecure = new URL(request.url).protocol === 'https:';
  headers.append('Set-Cookie', stateCookie(stateWithHint, isSecure));
  // Cross-origin GET, so do not need CORS headers here.
  return new Response(null, { status: 302, headers });
}
