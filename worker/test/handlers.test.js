/**
 * @fileoverview Integration tests for the Worker routes.
 * Uses a fake `fetch` to simulate GitHub and an in-memory KV via miniflare.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import worker from '../src/index.js';
import { _internals as sessionInternals } from '../src/session.js';

const { COOKIE_NAME, STATE_COOKIE } = sessionInternals;

const env = {
  ALLOWED_ORIGIN: 'http://localhost:8080',
  GITHUB_APP_ID: '12345',
  GITHUB_APP_CLIENT_ID: 'Iv1.test',
  GITHUB_APP_CLIENT_SECRET: 'test-secret',
  GITHUB_APP_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\nMIIBVgIBADANBgkqhkiG9w0BAQEFAASCAUAwggE8AgEAAkEAuFvwGm9Q+a7VxMvA\n9wQv8E8p1Qc3zEFhzCE1mFKcXJpKjgs8v2VhO0eJ8eB+KlczpXxYQq2JxllhAh0w\nM/eyNnh+LlBzhYU1Gzh6cGtOYjQ+Jlhy4slB5sMWdQIDAQABAkEAj3S0IH3aG7n9\npYjCaF4wO7b6f8c5Cp4K3vJyo1iSWoT3zM2lP3vI/A4wV3O0uYf9z6lZh9p1McC5b\nQIhAPxQzkA6Rv4K8VYpv3H2rD4pL6r5oFf6eR0m0rT4yYvAiEA1yC8zK7wQ0d2Y4z\n5Zj5d2C3G5R1lT6C2r8hZJ0w5j8CIQC9F8bM9X5z7k9C0yH0X5p1z2L3o8z2sS6Q7t\n9o1p2wKQIgCq1lH4wY3d7n4R5m8a9J3aY9o8K7pL2nQ1xT5z0e6ECIQD4r9wX9k3p\n2N8b1z4y3M2s7o9k0p1Q3R5L8n6eJ7c2g==\n-----END PRIVATE KEY-----',
  INSTALLATIONS: {
    async get() { return null; },
    async put() {},
    async delete() {},
  },
};

function ctx() {
  return {};
}

function buildRequest(url, init = {}) {
  const headers = new Headers(init.headers || {});
  if (init.origin) headers.set('Origin', init.origin);
  if (init.cookie) headers.set('Cookie', init.cookie);
  if (init.method) headers.set('X-Method', init.method);
  return new Request(url, { ...init, headers });
}

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await worker.fetch(
      buildRequest('https://worker.example/health', { method: 'GET' }),
      env,
      ctx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe('GET /auth/install', () => {
  it('redirects to GitHub with a state cookie set', async () => {
    const res = await worker.fetch(
      buildRequest('https://worker.example/auth/install', { method: 'GET' }),
      env,
      ctx(),
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('Location');
    expect(location).toMatch(/^https:\/\/github\.com\/apps\//);
    expect(location).toMatch(/state=/);
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toMatch(new RegExp(`${STATE_COOKIE}=`));
  });
});

describe('POST /auth/callback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests without a matching state cookie', async () => {
    const res = await worker.fetch(
      buildRequest('https://worker.example/auth/callback', {
        method: 'POST',
        origin: 'http://localhost:8080',
        body: JSON.stringify({ installation_id: '1', state: 'wrong' }),
      }),
      env,
      ctx(),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('state_mismatch');
  });

  it('rejects requests without an origin', async () => {
    const res = await worker.fetch(
      buildRequest('https://worker.example/auth/callback', {
        method: 'POST',
        body: JSON.stringify({ installation_id: '1', state: 'x' }),
      }),
      env,
      ctx(),
    );
    expect(res.status).toBe(403);
  });

  it('mints a session cookie on a valid callback', async () => {
    const state = 'abc123';
    // Stub the global fetch used by mintInstallationToken.
    const fakeToken = 'ghs_test';
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            token: fakeToken,
            expires_at: expiresAt,
            permissions: { contents: 'write' },
            repository: { full_name: 'octo/cat' },
          }),
          { status: 201 },
        ),
      ),
    );

    const res = await worker.fetch(
      buildRequest('https://worker.example/auth/callback', {
        method: 'POST',
        origin: 'http://localhost:8080',
        cookie: `${STATE_COOKIE}=${state}`,
        body: JSON.stringify({ installation_id: '42', state }),
      }),
      env,
      ctx(),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toMatch(new RegExp(`${COOKIE_NAME}=`));
    const body = await res.json();
    expect(body.account).toBe('octo');
    expect(body.repo).toBe('cat');
  });
});

describe('GET /token', () => {
  it('returns 401 without a session', async () => {
    const res = await worker.fetch(
      buildRequest('https://worker.example/token', {
        method: 'GET',
        origin: 'http://localhost:8080',
      }),
      env,
      ctx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 200 with a token for a valid session', async () => {
    const fakeToken = 'ghs_xyz';
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    env.INSTALLATIONS.get = async (key) => {
      if (key === 'session:sid-test') {
        return { installationId: '42', account: 'octo', repo: 'cat' };
      }
      if (key === 'install:42') {
        return { token: fakeToken, expiresAt };
      }
      return null;
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ token: fakeToken, expires_at: expiresAt }), { status: 201 }),
      ),
    );
    const res = await worker.fetch(
      buildRequest('https://worker.example/token', {
        method: 'GET',
        origin: 'http://localhost:8080',
        cookie: `${COOKIE_NAME}=sid-test`,
      }),
      env,
      ctx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe(fakeToken);
  });
});

describe('POST /auth/signout', () => {
  it('clears the session cookie', async () => {
    env.INSTALLATIONS.delete = async () => {};
    const res = await worker.fetch(
      buildRequest('https://worker.example/auth/signout', {
        method: 'POST',
        origin: 'http://localhost:8080',
        cookie: `${COOKIE_NAME}=whatever`,
      }),
      env,
      ctx(),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toMatch(/Max-Age=0/);
  });
});
