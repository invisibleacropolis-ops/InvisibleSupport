# Invisible Support — Auth Worker

A small Cloudflare Worker that sits between the static portal and the GitHub REST API. It:

- Signs short-lived RS256 JWTs with the GitHub App's private key.
- Exchanges them for installation access tokens (1-hour TTL).
- Caches the tokens in Cloudflare KV with a safety margin.
- Issues an opaque session cookie to the browser so the browser never holds a long-lived credential.
- Enforces CORS to a single configured origin (your GitHub Pages URL).

The browser calls this Worker; the Worker calls GitHub.

## Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/install` | GET | none | Redirects to GitHub's App install page. Sets a `state` cookie for CSRF protection. |
| `/auth/callback` | POST | `state` cookie | Body: `{ installation_id, state }`. Verifies the state cookie, mints a session, sets the `invsess` cookie. |
| `/auth/me` | GET | session | Returns `{ account, repo, installationId, installedAt }` or 401. |
| `/token` | GET | session | Returns a fresh (or cached, non-expired) installation access token. |
| `/auth/signout` | POST | session | Clears the session and the cookie. |
| `/health` | GET | none | Liveness probe — returns `{ ok, kv }`. |

## Local development

```bash
cd worker
npm install
wrangler dev --local
```

`wrangler dev` runs the Worker on `http://localhost:8787`. In another terminal:

```bash
# From the repo root
npm run serve
```

In the portal's Settings panel, set the **Auth worker URL** to `http://localhost:8787`. The Worker will be hit with credentials; CORS allows the configured origin.

> **You need a real GitHub App for local dev.** Generate a test App (single-repo, install on a throwaway repo), generate its private key, and `wrangler secret put` the four secrets listed below.

## Required secrets

Set with `wrangler secret put <NAME>`:

| Name | Notes |
|---|---|
| `GITHUB_APP_ID` | Numeric App ID from the App's settings page. |
| `GITHUB_APP_CLIENT_ID` | OAuth client ID (top of App settings). |
| `GITHUB_APP_CLIENT_SECRET` | Generated under the Client ID; treat as a secret. |
| `GITHUB_APP_PRIVATE_KEY` | Full PEM (including `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines). |

## Required vars (in `wrangler.toml`)

| Name | Notes |
|---|---|
| `ALLOWED_ORIGIN` | The exact origin the static site is served from (e.g. `https://<user>.github.io`). Browsers from any other origin are rejected. |
| `INSTALLATIONS` KV binding | Created with `wrangler kv namespace create INSTALLATIONS`; copy the id into `wrangler.toml`. |

## Tests

```bash
cd worker
npm test
```

Tests use `vitest` + `@cloudflare/vitest-pool-workers` to exercise the JWT signer, KV cache, and handler responses inside a local miniflare sandbox. The handler tests stub the `fetch` global to simulate GitHub's `/access_tokens` endpoint — no real GitHub calls are made.

## Key rotation runbook

If the App's private key is suspected to be compromised:

1. **Generate a new private key.** GitHub → App settings → **Private keys** → **Generate a private key**. The new key downloads as a `.pem` file.
2. **Update the Worker secret.**
   ```bash
   cd worker
   wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste the new PEM
   wrangler deploy
   ```
3. **Verify.** `curl https://<worker-url>/health` should return `{ "ok": true, "kv": "ok" }`. From the portal, click **Test connection** in Settings.
4. **Revoke the old key.** GitHub → App settings → **Private keys** → click **Delete** next to the old key.

There is no downtime: the new secret takes effect on the next request after `wrangler deploy`. Old sessions continue to work because their cached tokens in KV remain valid until expiry.

## Operational notes

- **Token TTL.** Installation tokens are valid for 1 hour. The Worker caches them in KV with `expirationTtl = expires_at - 60s` so the next request re-mints transparently.
- **CORS.** Only `ALLOWED_ORIGIN` is allowed, and only with `credentials: 'include'`. CORS preflight is handled in `cors.js`.
- **Cookies.** `invsess` and `invstate` are `HttpOnly; SameSite=Lax; Secure` (when served over HTTPS). The session ID is 32 bytes of randomness (64 hex chars); the session blob lives in KV under `session:<sid>`.
- **Single-repo App.** This Worker assumes the App is installed on a single repository. The session is bound to a single `installationId`; the browser sees `account/repo` and uses that for all REST calls.

## Architecture

```
┌──────────┐   GET /token     ┌──────────────┐  POST access_tokens  ┌─────────────┐
│  Browser │ ───────────────► │   Worker     │ ──────────────────► │  GitHub API │
│   (SPA)  │ ◄─────────────── │  (this repo) │ ◄────────────────── │             │
│          │  { token, exp }  │              │  { token, exp_at }  │             │
└──────────┘                  └──────┬───────┘                     └─────────────┘
                                    │
                                    ▼
                             ┌──────────────┐
                             │ Cloudflare KV│
                             │ (sessions +  │
                             │  token cache)│
                             └──────────────┘
```

## Security checklist

- [x] App private key is stored only as a Worker secret.
- [x] CORS restricted to a single allowed origin (no wildcard).
- [x] Cookies are `HttpOnly; SameSite=Lax; Secure`.
- [x] Session ID is 32 random bytes; session data is opaque to the browser.
- [x] CSRF protection on the OAuth callback via the `state` cookie.
- [x] Installation tokens cached for `expires_at - 60s`; never persisted past expiry.
- [x] Repo access is bounded to the App's installation, not the user's full account.
