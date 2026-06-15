/**
 * @fileoverview Auth client for the Cloudflare Worker auth proxy.
 *
 * The browser does not hold a long-lived GitHub credential. Instead, the
 * Worker mints short-lived installation tokens on demand. This module:
 *   1. Persists the Worker URL locally (set in the Settings panel).
 *   2. Asks the Worker for a fresh installation token before every REST call.
 *   3. Surfaces connection state via subscribers so the UI can react.
 *
 * Classic Personal Access Tokens (PATs) are no longer accepted by this app.
 */

const WORKER_URL_KEY = 'invisibleSupport.workerUrl';
const SESSION_KEY = 'invisibleSupport.session';

const DEFAULT_WORKER_URL = '';

const listeners = new Set();
let state = loadState();

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      return {
        workerUrl: typeof stored.workerUrl === 'string' ? stored.workerUrl : DEFAULT_WORKER_URL,
        account: typeof stored.account === 'string' ? stored.account : '',
        repo: typeof stored.repo === 'string' ? stored.repo : '',
        installationId: typeof stored.installationId === 'string' ? stored.installationId : '',
        installedAt: typeof stored.installedAt === 'string' ? stored.installedAt : '',
      };
    }
  } catch (e) {
    console.warn('Failed to read auth state', e);
  }
  return {
    workerUrl: localStorage.getItem(WORKER_URL_KEY) || DEFAULT_WORKER_URL,
    account: '',
    repo: '',
    installationId: '',
    installedAt: '',
  };
}

function persist() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist auth state', e);
  }
}

function notify() {
  const snapshot = getState();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (e) {
      console.warn('Auth state listener error', e);
    }
  });
}

export function getState() {
  return { ...state };
}

export function getWorkerUrl() {
  return state.workerUrl || '';
}

export function setWorkerUrl(url) {
  state = { ...state, workerUrl: String(url || '').trim() };
  persist();
  notify();
}

export function isConnected() {
  return Boolean(state.workerUrl && state.account && state.repo);
}

export function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  listener(getState());
  return () => listeners.delete(listener);
}

export function onUnauthorized() {
  state = { ...state, account: '', repo: '', installationId: '' };
  persist();
  notify();
}

/**
 * Fetches a fresh installation access token from the Worker.
 * Throws an `AuthError` if the Worker URL is missing or the session is invalid.
 * @returns {Promise<string>}
 */
export async function fetchInstallationToken() {
  const url = state.workerUrl;
  if (!url) {
    throw new AuthError('worker_url_missing', 'Worker URL is not configured.');
  }
  let response;
  try {
    response = await fetch(trimUrl(url) + '/token', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    throw new AuthError('network', `Could not reach the auth worker: ${e.message}`);
  }
  if (response.status === 401) {
    onUnauthorized();
    throw new AuthError('unauthorized', 'No active session. Connect GitHub in Settings.');
  }
  if (!response.ok) {
    throw new AuthError('request_failed', `Token request failed (${response.status}).`);
  }
  const body = await response.json();
  if (!body || typeof body.token !== 'string') {
    throw new AuthError('invalid_payload', 'Worker returned an unexpected token payload.');
  }
  return body.token;
}

/**
 * Fetches session metadata (account, repo) from the Worker.
 * @returns {Promise<{ account: string, repo: string, installationId: string, installedAt: string } | null>}
 */
export async function fetchSession() {
  const url = state.workerUrl;
  if (!url) return null;
  let response;
  try {
    response = await fetch(trimUrl(url) + '/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    console.warn('Session probe failed', e);
    return null;
  }
  if (response.status === 401) {
    state = { ...state, account: '', repo: '', installationId: '' };
    persist();
    notify();
    return null;
  }
  if (!response.ok) return null;
  const body = await response.json();
  state = {
    ...state,
    account: body.account || '',
    repo: body.repo || '',
    installationId: body.installationId || '',
    installedAt: body.installedAt || '',
  };
  persist();
  notify();
  return getState();
}

/**
 * Begins the install flow by redirecting the browser to the Worker, which
 * in turn redirects to GitHub's App install page.
 */
export function beginInstall() {
  const url = state.workerUrl;
  if (!url) {
    throw new AuthError('worker_url_missing', 'Worker URL is not configured.');
  }
  window.location.assign(trimUrl(url) + '/auth/install');
}

/**
 * Sends a POST to /auth/signout to invalidate the session.
 */
export async function signOut() {
  const url = state.workerUrl;
  if (!url) return;
  try {
    await fetch(trimUrl(url) + '/auth/signout', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    console.warn('Sign-out request failed', e);
  }
  state = { ...state, account: '', repo: '', installationId: '', installedAt: '' };
  persist();
  notify();
}

function trimUrl(url) {
  return String(url).replace(/\/+$/, '');
}

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
