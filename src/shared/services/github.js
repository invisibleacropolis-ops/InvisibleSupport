/**
 * @fileoverview GitHub API client for file storage operations.
 * Provides CRUD operations for files stored in a GitHub repository.
 *
 * Authentication is delegated to the Cloudflare Worker auth proxy
 * (see `./auth-client.js`). This service obtains a short-lived installation
 * token on demand for every REST call.
 */

import { t } from '../localization/index.js';
import { fetchInstallationToken, isConnected, AuthError } from './auth-client.js';

// Configuration keys
const CONFIG_KEY = 'invisibleSupport.githubConfig';
const REJECTED_TOKEN_PREFIXES = ['ghp_', 'github_pat_', 'gho_', 'ghu_', 'ghs_', 'ghr_'];

// Text encoding/decoding utilities
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

/**
 * Infers repository defaults from GitHub Pages URL.
 * The actual account/repo are populated by the auth client's session
 * probe; this is purely a hint for the Settings form's initial value.
 */
function inferRepositoryDefaults() {
    try {
        const { hostname, pathname } = window.location || {};
        if (!hostname || !hostname.endsWith('github.io')) {
            return { owner: '', repo: '' };
        }
        const parts = hostname.split('.');
        if (parts.length < 3) {
            return { owner: '', repo: '' };
        }
        const owner = parts[0];
        const cleanPath = (pathname || '').replace(/^\/+|\/+$|\s+/g, '');
        if (!cleanPath) {
            return { owner, repo: `${owner}.github.io` };
        }
        const [repo] = cleanPath.split('/');
        return { owner, repo: repo || '' };
    } catch (error) {
        console.warn('Failed to infer GitHub repository from location', error);
        return { owner: '', repo: '' };
    }
}

const inferred = inferRepositoryDefaults();
const DEFAULT_CONFIG = {
    owner: inferred.owner,
    repo: inferred.repo,
    branch: 'main',
    storageLimitMb: 200,
};

// Internal state
const configListeners = new Set();
let config = loadConfigFromStorage();

function sanitizeConfig(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_CONFIG };
    }
    const limit = Number(raw.storageLimitMb);
    const owner = typeof raw.owner === 'string' ? raw.owner.trim() : '';
    const repo = typeof raw.repo === 'string' ? raw.repo.trim() : '';
    const branch =
        typeof raw.branch === 'string' && raw.branch.trim() ? raw.branch.trim() : DEFAULT_CONFIG.branch;
    return {
        owner: owner || DEFAULT_CONFIG.owner,
        repo: repo || DEFAULT_CONFIG.repo,
        branch,
        storageLimitMb: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_CONFIG.storageLimitMb,
    };
}

function loadConfigFromStorage() {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        if (!stored) return { ...DEFAULT_CONFIG };
        const parsed = JSON.parse(stored);
        return sanitizeConfig(parsed);
    } catch (error) {
        console.warn('Failed to read GitHub configuration', error);
        return { ...DEFAULT_CONFIG };
    }
}

function notifyConfigListeners() {
    const snapshot = getConfig();
    configListeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch (error) {
            console.warn('GitHub config listener error', error);
        }
    });
}

function persistConfig(next) {
    config = sanitizeConfig({ ...config, ...next });
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
        console.warn('Unable to persist GitHub configuration', error);
    }
    notifyConfigListeners();
}

export function getConfig() {
    return { ...config };
}

export function subscribe(listener) {
    if (typeof listener !== 'function') return () => { };
    configListeners.add(listener);
    listener(getConfig());
    return () => configListeners.delete(listener);
}

export function updateConfig(partial = {}) {
    // Refuse any attempt to set a classic or fine-grained PAT.
    if (typeof partial.token === 'string' && partial.token.trim()) {
        throw new Error('Personal access tokens are no longer supported. Connect via the GitHub App.');
    }
    persistConfig(partial);
}

export function isConfigured() {
    return Boolean(config.owner && config.repo && isConnected());
}

function ensureConfigured() {
    if (isConfigured()) return;
    const error = new Error(t('errors.githubConfigMissing'));
    error.code = 'config';
    throw error;
}

function getBranch() {
    return config.branch && config.branch.trim() ? config.branch.trim() : DEFAULT_CONFIG.branch;
}

function buildApiBase() {
    return `https://api.github.com/repos/${config.owner}/${config.repo}`;
}

function buildApiUrl(path = '') {
    const base = buildApiBase();
    return path ? `${base}/${path}` : base;
}

function buildHeaders(token, extra) {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (extra) {
        Object.assign(headers, extra);
    }
    return headers;
}

function encodePath(path) {
    return path
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

function encodeBase64(value) {
    if (!value) return '';
    if (textEncoder) {
        const bytes = textEncoder.encode(value);
        let binary = '';
        bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary);
    }
    return btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64(value) {
    if (!value) return '';
    try {
        const binary = atob(value);
        if (textDecoder) {
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            return textDecoder.decode(bytes);
        }
        return decodeURIComponent(escape(binary));
    } catch (error) {
        console.warn('Failed to decode base64 payload', error);
        return '';
    }
}

/**
 * Wraps a REST call: gets a fresh installation token, invokes the call,
 * and re-tries once on a 401 by re-fetching a token.
 * @template T
 * @param {(token: string) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withFreshToken(fn) {
    let token;
    try {
        token = await fetchInstallationToken();
    } catch (e) {
        if (e instanceof AuthError) {
            const error = new Error(t('errors.githubAuthRequired'));
            error.code = 'auth';
            error.cause = e;
            throw error;
        }
        throw e;
    }
    try {
        return await fn(token);
    } catch (err) {
        if (err?.status === 401) {
            // Token may have been revoked or expired; retry once.
            try {
                const newToken = await fetchInstallationToken();
                return await fn(newToken);
            } catch (e2) {
                if (e2 instanceof AuthError) {
                    const error = new Error(t('errors.githubAuthRequired'));
                    error.code = 'auth';
                    error.cause = e2;
                    throw error;
                }
                throw e2;
            }
        }
        throw err;
    }
}

function makeApiError(message, response, payload) {
    const error = new Error(payload?.message || message);
    error.code = 'request';
    error.status = response.status;
    error.payload = payload;
    return error;
}

export async function getContents(path) {
    ensureConfigured();
    const encodedPath = encodePath(path);
    const branch = encodeURIComponent(getBranch());
    const url = `${buildApiUrl(`contents/${encodedPath}`)}?ref=${branch}`;
    return withFreshToken(async (token) => {
        const response = await fetch(url, { headers: buildHeaders(token) });
        if (response.status === 404) return null;
        let payload = null;
        if (!response.ok) {
            try { payload = await response.json(); } catch (e) { payload = null; }
            throw makeApiError(t('errors.githubRequestFailed'), response, payload);
        }
        return response.json();
    });
}

async function putContents(path, { message, content, sha } = {}) {
    ensureConfigured();
    const body = {
        message: message || `Update ${path}`,
        content,
        branch: getBranch(),
    };
    if (sha) body.sha = sha;
    return withFreshToken(async (token) => {
        const response = await fetch(buildApiUrl(`contents/${encodePath(path)}`), {
            method: 'PUT',
            headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            let payload = null;
            try { payload = await response.json(); } catch (e) { payload = null; }
            throw makeApiError(t('errors.githubRequestFailed'), response, payload);
        }
        return response.json();
    });
}

async function deleteContents(path, { message, sha } = {}) {
    ensureConfigured();
    const body = {
        message: message || `Remove ${path}`,
        sha,
        branch: getBranch(),
    };
    return withFreshToken(async (token) => {
        const response = await fetch(buildApiUrl(`contents/${encodePath(path)}`), {
            method: 'DELETE',
            headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
            body: JSON.stringify(body),
        });
        if (response.status === 404) return null;
        if (!response.ok) {
            let payload = null;
            try { payload = await response.json(); } catch (e) { payload = null; }
            throw makeApiError(t('errors.githubRequestFailed'), response, payload);
        }
        return response.json();
    });
}

export async function downloadFile(path) {
    ensureConfigured();
    const branch = encodeURIComponent(getBranch());
    const url = `${buildApiUrl(`contents/${encodePath(path)}`)}?ref=${branch}`;
    return withFreshToken(async (token) => {
        const response = await fetch(url, {
            headers: buildHeaders(token, { Accept: 'application/vnd.github.v3.raw' }),
        });
        if (!response.ok) {
            let payload = null;
            try { payload = await response.json(); } catch (e) { payload = null; }
            throw makeApiError(t('errors.githubRequestFailed'), response, payload);
        }
        const contentType = response.headers.get('Content-Type') || '';
        const arrayBuffer = await response.arrayBuffer();
        return { arrayBuffer, contentType };
    });
}

export async function readManifest(path) {
    const file = await getContents(path);
    if (!file) return { items: [], sha: null };
    const text = decodeBase64(file.content || '');
    let data = [];
    if (text) {
        try {
            const parsed = JSON.parse(text);
            data = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Failed to parse manifest', error);
            data = [];
        }
    }
    return { items: data, sha: file.sha };
}

export async function writeManifest(path, items, sha) {
    const payload = JSON.stringify(items ?? [], null, 2);
    const response = await putContents(path, {
        content: encodeBase64(payload),
        message: `Update ${path}`,
        sha,
    });
    return {
        sha: response?.content?.sha ?? response?.sha ?? null,
        path: response?.content?.path ?? path,
    };
}

export async function deleteManifest(path, sha) {
    await deleteContents(path, { sha, message: `Remove ${path}` });
}

export async function uploadFile(path, base64Content, message) {
    const response = await putContents(path, { content: base64Content, message });
    const content = response?.content ?? {};
    return {
        path: content.path ?? path,
        sha: content.sha ?? response?.sha ?? null,
        downloadUrl: content.download_url ?? buildRawUrl(content.path ?? path),
    };
}

export async function deleteFile(path, sha, message) {
    await deleteContents(path, { sha, message });
}

export async function testConnection() {
    ensureConfigured();
    return withFreshToken(async (token) => {
        const response = await fetch(buildApiUrl(), { headers: buildHeaders(token) });
        if (!response.ok) {
            let payload = null;
            try { payload = await response.json(); } catch (e) { payload = null; }
            throw makeApiError(t('errors.githubRequestFailed'), response, payload);
        }
        return true;
    });
}

export function getStorageLimitBytes() {
    const limitMb = Number(config.storageLimitMb);
    if (Number.isFinite(limitMb) && limitMb > 0) {
        return limitMb * 1024 * 1024;
    }
    return DEFAULT_CONFIG.storageLimitMb * 1024 * 1024;
}

export function buildRawUrl(path) {
    if (!config.owner || !config.repo) return '';
    return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${getBranch()}/${path}`;
}

/**
 * Returns true if the value looks like a Personal Access Token (classic or fine-grained).
 * Useful for the UI to refuse pasted PATs even if the underlying service would reject them.
 */
export function looksLikePat(value) {
    if (typeof value !== 'string') return false;
    return REJECTED_TOKEN_PREFIXES.some((p) => value.trim().startsWith(p));
}

// Default export
export default {
    getConfig,
    updateConfig,
    subscribe,
    isConfigured,
    readManifest,
    writeManifest,
    deleteManifest,
    uploadFile,
    deleteFile,
    testConnection,
    getStorageLimitBytes,
    buildRawUrl,
    downloadFile,
    looksLikePat,
};
