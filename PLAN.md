# PLAN: GitHub App + Cloudflare Worker Auth Proxy

**Status:** Approved — in build
**Owner:** InvisibleSupport
**Date:** 2026-06-15

---

## 1. Goal & Motivation

The portal currently authenticates to the GitHub API with a **classic Personal Access Token (PAT)** pasted into the Settings panel. Classic PATs:

- Expire (max 1 year, often 30 days by default).
- Have a single broad `repo` scope.
- Must be rotated manually every few months.
- Live in browser localStorage in plaintext.

This plan replaces that model with a **GitHub App + Cloudflare Worker** that issues short-lived installation tokens on demand. Result:

- No manual rotation; installation tokens are minted automatically (~1h TTL, re-minted by the Worker before each browser request).
- Token scope is narrow (Contents R/W + Metadata R), not the whole `repo` umbrella.
- The browser never holds a long-lived secret — only a Worker-issued session cookie.
- Rejecting classic PATs is enforced in code; the PAT input is removed from the UI.

---

## 2. Architecture

```
+--------------+      /auth/callback       +-----------------+    JWT (App)    +----------------+
|   Browser    | ------------------------> |  Cloudflare     | --------------> | GitHub API     |
| (Static SPA) |                           |  Worker         | <-------------- | (App endpoint) |
|              | <------------------------ |                 |    install.     +----------------+
|              |     session cookie        |  - JWT signer   |    token
|              |                           |  - KV cache     |
|              |       /token              |  - CORS gate    |
|              | ------------------------> |                 |
|              | <------------------------ |                 |
|              |  installation access      |                 |
|              |  token (1h, cached)       |                 |
|              |                           |                 |
|              |   REST API as Bearer      |                 |
|              | -------------------------------------------------------> GitHub REST
+--------------+                                                   +----------------+
```

- **Browser → Worker**: session cookie (`invsess`, `HttpOnly; Secure; SameSite=Lax`).
- **Worker → Browser**: JSON `{ token, expires_at, repo, account }`.
- **Browser → GitHub REST**: `Authorization: Bearer <installation_token>`.

---

## 3. One-Time Setup

Run these in order. The Worker is unusable until all steps complete.

### 3.1 Register a GitHub App
1. Go to `https://github.com/settings/apps/new`.
2. **GitHub App name**: `Invisible Support Portal` (must be unique org-wide).
3. **Homepage URL**: `https://<github-pages-host>` (your Pages URL).
4. **Callback URL**: `https://<worker-host>/auth/callback` (Worker URL you'll deploy in 3.4).
5. **Webhook**: ❌ Uncheck "Active" (we don't need webhooks for this flow).
6. **Repository permissions**:
   - `Contents`: Read & write
   - `Metadata`: Read-only (default)
7. **Where can this App be installed?**: "Only on this account" (single-repo model).
8. Click **Create GitHub App**.
9. On the App's settings page:
   - Note the **App ID** (numeric) → `GITHUB_APP_ID`.
   - Click **Generate a new client secret** → copy → `GITHUB_APP_CLIENT_SECRET`.
   - Note the **Client ID** (visible at top of page) → `GITHUB_APP_CLIENT_ID`.
   - Scroll to **Private keys** → **Generate a private key** → downloads a `.pem` file.
10. Click **Install App** in the sidebar → install on the target repository only.

### 3.2 Local prerequisites
```bash
npm install -g wrangler
wrangler login
```

### 3.3 Create the KV namespace
```bash
cd worker
wrangler kv namespace create INSTALLATIONS
```
Copy the returned `id` into `worker/wrangler.toml` under `[[kv_namespaces]]`.

### 3.4 Set Worker secrets
```bash
cd worker
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_APP_CLIENT_ID
wrangler secret put GITHUB_APP_CLIENT_SECRET
wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste the entire PEM, including BEGIN/END lines
wrangler secret put ALLOWED_ORIGIN           # e.g. https://<user>.github.io
```

### 3.5 Deploy
```bash
cd worker
wrangler deploy
```
Note the deployed URL (e.g. `https://invisible-support-auth.<subdomain>.workers.dev`) — this is your `WORKER_URL`.

### 3.6 Configure the static site
In the app's Settings panel:
- **Worker URL**: paste the URL from 3.5.
- Click **Connect GitHub** → redirected to GitHub App install page (or to a fresh install if not yet installed) → approve → redirected back to the app with a session cookie.
- Reload the page; the Settings panel should now show the connected repo and account.

---

## 4. Runtime Flow (Worker routes)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/callback` | `POST` | none | Body: `{ code, installation_id, state }`. Validates `state` against a cookie. Exchanges `code` for an installation token. Mints a session, stores `{ installation_id, repo, account, token, expires_at }` in KV under `install:<installation_id>` and `session:<sid>`. Sets the `invsess` cookie. Returns `{ account, repo }`. |
| `/auth/me` | `GET` | session | Returns `{ account, repo, installed_at }` or `401`. |
| `/token` | `GET` | session | Returns a fresh (or cached, non-expired) installation access token: `{ token, expires_at }`. If the cached token is within 60s of expiry, the Worker re-mints via the App's JWT. |
| `/auth/signout` | `POST` | session | Deletes the session from KV, clears the cookie. |
| `/health` | `GET` | none | Returns `{ ok: true, kv: 'ok', version }`. Used by uptime checks. |

### Token lifecycle inside the Worker
1. Worker signs a **JWT** with the App's private key (RS256, 10-minute expiry, `iat - 60s`).
2. POSTs to `https://api.github.com/app/installations/<installation_id>/access_tokens` with the JWT.
3. GitHub returns `{ token, expires_at }` (token valid 1h).
4. Worker writes to KV with TTL = `expires_at - 60s`.
5. On `/token`, Worker reads KV. If absent/expired, re-mints. If fresh, returns cached.

---

## 5. Repo-Side Refactor (file-by-file)

### New
- `worker/wrangler.toml` — Worker config (name, main, compatibility date, KV binding, vars).
- `worker/src/index.js` — router + CORS wrapper.
- `worker/src/github.js` — JWT signer, installation-token mint/refresh.
- `worker/src/kv.js` — KV get/set/delete helpers.
- `worker/src/cors.js` — origin allow-list middleware.
- `worker/src/session.js` — opaque session ID mint + cookie helpers.
- `worker/src/handlers/auth-callback.js` — `/auth/callback` handler.
- `worker/src/handlers/auth-me.js` — `/auth/me` handler.
- `worker/src/handlers/token.js` — `/token` handler.
- `worker/src/handlers/signout.js` — `/auth/signout` handler.
- `worker/src/handlers/health.js` — `/health` handler.
- `worker/test/github.test.js` — vitest + miniflare unit tests for JWT signing, token mint, KV cache.
- `worker/test/handlers.test.js` — handler integration tests.
- `worker/README.md` — deploy + secret-rotation runbook.
- `worker/package.json` — Wrangler + vitest + miniflare devDeps.

### Modified
- **`src/shared/services/github.js`**:
  - Remove the `localStorage` PAT retrieval path entirely.
  - Add `getInstallationToken()` → `fetch(WORKER_URL + '/token', { credentials: 'include' })`.
  - Wrap all REST calls in `withFreshToken(fn)` that fetches a token then calls `fn(token)`.
  - Add a clear error if `/token` returns 401 (redirect to Settings).
- **`src/features/settings/`** (the *Repository storage* panel):
  - Remove the "Personal Access Token" text field.
  - Add a **Worker URL** field (persisted in localStorage as `worker_url`).
  - Add a **Connect GitHub** button that opens `${WORKER_URL}/auth/install` (the Worker redirects to GitHub).
  - Add a **Disconnect** button.
  - On load: `GET /auth/me` to populate "Connected as `<account>` on `<repo>`".
  - Display install timestamp.
  - **Reject classic PATs**: any code path accepting `ghp_…` / `github_pat_…` is removed.
- **`src/main.js`**: boot sequence calls `/auth/me`; if 401, show a banner "Connect GitHub in Settings to use this app" and gate upload/load features.
- **`README.md`**: new "Authentication" section, updated "Configuration" steps.
- **`Setup.md`**: step-by-step App + Worker setup.
- **`package.json`**: add `npm run worker:dev` → `wrangler dev --local` (run from `worker/`); `npm run worker:deploy` → `wrangler deploy` (from `worker/`); `npm run test:worker` → vitest in `worker/`.

### Removed/deprecated
- The "Personal Access Token (Classic) with `repo` scope" instruction (README §Configuration, step 3).
- Any localStorage key holding a raw PAT (`gh_token` or similar — to be verified and removed during refactor).

---

## 6. Security Checklist

- **Secrets**: App private key lives only as a Cloudflare Worker secret. Never in the static site bundle.
- **CORS**: Worker responds to `Access-Control-Allow-Origin: <ALLOWED_ORIGIN>` only. No wildcard.
- **Cookies**: `invsess` is `HttpOnly; Secure; SameSite=Lax`; `Path=/`; `Max-Age=2592000` (30 days, sliding).
- **CSRF**: `/auth/callback` requires a `state` parameter matching a cookie set at flow start.
- **Session storage**: KV key `session:<sid>` is opaque (32 random bytes hex); the cookie is also opaque.
- **Repo access**: App's installation is bounded to the single configured repo; tokens cannot read other repos.
- **No client-side token storage**: the browser only ever holds the session cookie, not an installation token.

### Key rotation runbook (App private key compromise)
1. GitHub → App settings → **Private keys** → **Generate a new private key**.
2. `wrangler secret put GITHUB_APP_PRIVATE_KEY` (paste new PEM).
3. `wrangler deploy` (no config change, but re-publishes).
4. Verify `/health` returns `{ ok: true, kv: 'ok' }`.
5. In the App settings page, click **Delete** next to the old key.

---

## 7. Migration / Cutover

**Hard cutover** per project decision. The legacy PAT UI is deleted in the same release that introduces the Worker. No `/auth/legacy-migrate` endpoint.

Rollback safety valve: the Settings panel will keep a one-release escape hatch behind a query param `?legacyAuth=1` that re-enables the old PAT text field (code path, not the recommended path). This is for emergency recovery only and is removed in the next release.

---

## 8. Testing & Verification

### Local dev (real Worker required)
```bash
# Terminal 1 — static site
npm run serve

# Terminal 2 — Worker
cd worker
npm install
wrangler dev --local
```

### Worker unit tests
- `worker/test/github.test.js`:
  - `signAppJwt` produces a valid RS256 JWT with `iat - 60s` and 10-minute expiry.
  - `mintInstallationToken` calls the correct endpoint with the JWT.
  - `getOrMintToken` returns cached value when fresh; re-mints when expired.
- `worker/test/handlers.test.js`:
  - `/auth/callback` rejects missing/invalid `state`.
  - `/auth/callback` sets the session cookie and stores KV entry on success.
  - `/token` returns 401 without a session.
  - `/token` returns 200 + token with valid session.
  - `/auth/signout` clears the session.
  - `/health` returns 200 + `{ ok: true }`.

### Playwright E2E
- `tests/e2e/auth.spec.js`:
  - Stub the Worker with a static response (`tests/e2e/fixtures/worker-stub.js`).
  - Visit the app → assert the "Connect GitHub" banner is visible.
  - Mock the OAuth callback → assert the Settings panel shows the connected repo.
  - Mock a `/token` 401 → assert the app re-prompts for connection.

### Manual smoke test
1. Deploy the Worker to a dev subdomain.
2. Install the App on a throwaway repo.
3. Open the app, click **Connect GitHub**, complete the flow.
4. Upload a file → verify a commit lands in the throwaway repo.
5. Reload the app → verify the connection persists.
6. Revoke the App install from `https://github.com/settings/installations` → verify the app shows a re-auth banner.

---

## 9. Rollback Plan

- **Code-level**: the `?legacyAuth=1` escape hatch in Settings (above) restores the PAT input. Shipped for one release, then removed.
- **Infra-level**: `wrangler rollback` reverts the Worker to the previous version. Session data in KV persists.
- **Data-level**: no migration of existing `storage/*.json` is needed; the Worker uses the same GitHub App permissions (Contents R/W) and accesses the same paths.

---

## 10. Open Follow-Ups (post-MVP)

- Custom domain for the Worker (e.g. `auth.invisiblesupport.example.com`).
- Uptime monitoring on `/health` (e.g. Cloudflare Workers Analytics + Slack alert).
- Optional GitHub App webhook for `installation.deleted` → proactively sign the user out.
- Migrate remaining `localStorage` uses in `storage-manager.js` to the Worker session once we confirm no PAT keys remain.
