# Deployment Plan

A complete, ordered walkthrough of every action required to take the Invisible Support Portal from this checkout to a fully deployed, working production state. Follow the steps in order — each one depends on the previous.

> **Time estimate:** 30–45 minutes for a first deploy. Most of that is the one-time GitHub App and Cloudflare account setup; future deploys take ~2 minutes.

> **What you'll have at the end:**
> - A GitHub App registered under your account, installed on the storage repo.
> - A Cloudflare Worker running on `*.workers.dev` that mints short-lived installation tokens.
> - The static portal hosted on GitHub Pages (no changes needed if it's already there) talking to that Worker.
> - A connection in the portal's Settings panel: **Connected as `<account>` on `<repo>`**.

---

## 0. Prerequisites (5 min)

### 0.1 Tools you need on your workstation
| Tool | Why | How to get it |
|---|---|---|
| **Node.js 20+** | Run the build, dev server, and Wrangler CLI | `https://nodejs.org` (LTS installer). Verify: `node --version` |
| **npm 10+** | Comes with Node | Verify: `npm --version` |
| **Git** | Clone, push, Pages deploy | `https://git-scm.com` |
| **A modern browser** | Drive the portal + the GitHub App install flow | Edge, Chrome, Firefox, Safari |
| **Wrangler CLI** (we install it in step 3) | Deploy the Worker | `npm install -g wrangler` |

### 0.2 Accounts you need
1. **GitHub account** with permission to:
   - Create GitHub Apps under your personal account or an org you admin.
   - Install the App on the repository that backs your portal.
2. **Cloudflare account** (free tier is fine) — sign up at `https://dash.cloudflare.com/sign-up`. Email + password; no payment method required for the free tier.

### 0.3 Pick the storage repository
The portal uses **one repository** as its database. Pick the repository that already backs (or will back) the GitHub Pages site where the portal lives. Same-repo storage is supported and is the simplest setup.

> **Single-repo only.** This deployment is configured for a single installation. If you need multi-repo storage, see "Open follow-ups" at the bottom.

---

## 1. Sign up for / log into Cloudflare (3 min)

1. Open `https://dash.cloudflare.com/sign-up`.
2. Enter your email and a strong password, click **Create Account**.
3. Verify the email address Cloudflare sends you.
4. After login, you'll land on the **Account Home** dashboard. The account ID is shown in the URL bar (e.g. `https://dash.cloudflare.com/<account-id>/...`). Note this — you may need it for Wrangler.
5. You do **not** need to add a site/zone to Cloudflare for this Worker. Workers run independently of any domain you might later bind.

> **Free tier limits:** 100,000 Worker requests/day, 1 GB KV storage, 100,000 KV reads/day, 1,000 KV writes/day. Comfortably more than this portal will use.

---

## 2. Create the GitHub App (8 min)

> The App replaces the old Personal Access Token. Once installed, it gives the Worker a narrow, repo-scoped credential that auto-refreshes.

1. Open `https://github.com/settings/apps/new` (or, for an org, `https://github.com/organizations/<org>/settings/apps/new`).
2. Fill in the form:
   - **GitHub App name**: `Invisible Support Portal` — must be unique across all of GitHub. If it's taken, suffix your username, e.g. `Invisible Support Portal (acme-dev)`.
   - **Homepage URL**: `https://<user>.github.io` (your GitHub Pages URL; the path segment is included automatically if the site lives at `https://<user>.github.io/<repo>/`, and that's fine).
   - **Identifying color** / **Icon**: optional, cosmetic.
3. **Callback URL** section — leave blank for now; GitHub Apps don't use OAuth callbacks in this flow. (The Worker handles the install return URL itself.)
4. **Webhook**:
   - **Active**: ❌ **uncheck**. This flow does not use webhooks.
5. **Repository permissions** (under "Repository permissions"):
   - `Contents`: **Read and write**
   - `Metadata`: **Read-only** (default; do not change)
   Leave every other permission on "No access" to keep the principle of least privilege.
6. **Organization permissions**: leave everything on "No access" unless you have a specific need.
7. **Where can this GitHub App be installed?**: select **Only on this account** (single-repo model).
8. Click **Create GitHub App**.

### 2.1 Capture the four secrets you need

On the App's settings page (you'll be redirected automatically), note down the following. **Do not close this page until you've stored them somewhere safe** (password manager, Bitwarden, etc.).

| What | Where to find it | Goes to |
|---|---|---|
| **App ID** (numeric) | Top right of the App's settings page | `GITHUB_APP_ID` |
| **Client ID** | Top right, just below the App ID | `GITHUB_APP_CLIENT_ID` |
| **Client secret** | Click **Generate a new client secret**, copy the value shown, **save it now** (GitHub will not show it again) | `GITHUB_APP_CLIENT_SECRET` |
| **Private key (.pem)** | Scroll to **Private keys** → click **Generate a private key** → a `.pem` file downloads | `GITHUB_APP_PRIVATE_KEY` |

> The .pem file is a multiline text file starting with `-----BEGIN RSA PRIVATE KEY-----` (or `PRIVATE KEY` for the newer format) and ending with `-----END ...`. **Do not commit this file anywhere.**

### 2.2 Install the App on the storage repository

1. In the left sidebar, click **Install App** → click **Install** next to the account/organization.
2. Choose **Only select repositories** → pick the single repo that will store uploads → click **Install**.
3. You'll be redirected to a confirmation page. The URL contains a numeric `installation_id` — note it for later (you'll see it echoed back in the portal after the install flow).

> If the App is already installed and you want to re-confirm the repository selection: `https://github.com/settings/installations` → click **Configure** next to the App → adjust repositories.

---

## 3. Install Wrangler and log in (2 min)

`wrangler` is Cloudflare's official CLI for Workers. Install it globally and authenticate.

```bash
npm install -g wrangler
wrangler --version
wrangler login
```

`wrangler login` opens a browser tab, asks you to allow the Wrangler CLI to access your Cloudflare account, and saves an OAuth token to `~/.config/.wrangler/` (or `%USERPROFILE%\.wrangler\` on Windows). After the browser redirects, return to the terminal — it should print `Successfully logged in.`.

Verify:
```bash
wrangler whoami
```
This prints your Cloudflare account ID and email.

---

## 4. Install the Worker's local dependencies (1 min)

From the repo root:
```bash
cd worker
npm install
```
This installs `wrangler`, `vitest`, and `@cloudflare/vitest-pool-workers` into `worker/node_modules/`. They are not used by the static site.

---

## 5. Create the KV namespace (1 min)

The Worker stores sessions and cached installation tokens in a Cloudflare KV namespace.

```bash
cd worker
wrangler kv namespace create INSTALLATIONS
```

Output looks like:
```
🌀 Creating namespace with title "worker-INSTALLATIONS"
✨ Success! Add the following to your configuration file in:
✨  [[kv_namespaces]]
✨  binding = "INSTALLATIONS"
✨  id = "abc123def456abc123def456abc123de"
```

Copy the `id` value and paste it into `worker/wrangler.toml`, replacing the placeholder:

```toml
[[kv_namespaces]]
binding = "INSTALLATIONS"
id = "abc123def456abc123def456abc123de"  # ← your real id
```

---

## 6. Set the four required secrets (3 min)

For each of the four values captured in Step 2.1, run a `wrangler secret put` command. Wrangler will prompt for the value via stdin (so it doesn't echo to your terminal history or the screen).

```bash
cd worker

# 1. App ID (numeric)
wrangler secret put GITHUB_APP_ID
# (paste the numeric App ID, then Enter)

# 2. Client ID
wrangler secret put GITHUB_APP_CLIENT_ID
# (paste the Client ID)

# 3. Client secret
wrangler secret put GITHUB_APP_CLIENT_SECRET
# (paste the secret)

# 4. Private key (PEM, multiline)
wrangler secret put GITHUB_APP_PRIVATE_KEY
# (paste the ENTIRE .pem file, including the BEGIN/END lines; on Windows,
#  right-click in the terminal to paste, then press Enter twice)
```

Verify the secrets are stored:
```bash
wrangler secret list
```
You should see all four listed.

> **On Windows:** pasting into PowerShell's `wrangler secret put` prompt works, but newlines may be escaped. If you see `Invalid private key` errors later, open the `.pem` file in a plain-text editor, select all, copy, and paste in one go. The PEM should be roughly 30 lines.

---

## 7. Set the `ALLOWED_ORIGIN` var (1 min)

The Worker only accepts requests from one origin (your portal's URL) to prevent cross-origin abuse. Edit `worker/wrangler.toml` and set the `[vars]` block:

```toml
[vars]
# Set the exact origin your portal is served from.
# Examples:
#   https://<user>.github.io
#   https://<user>.github.io/<repo>      (for project Pages sites)
#   https://your-custom-domain.com
ALLOWED_ORIGIN = "https://<user>.github.io"
```

> **Important:** no trailing slash. The origin is scheme + host (+ optional path), not a URL.

---

## 8. Run the Worker's unit tests (2 min)

Before deploying, confirm the Worker is healthy on your machine.

```bash
cd worker
npm test
```

Expected output: all tests pass, including:
- `base64url` / `pemToBuffer` round-trips
- `signAppJwt` produces a valid RS256 JWT, signature verifies with the matching public key
- `/health` returns 200
- `/auth/install` returns 302 with a state cookie
- `/auth/callback` rejects missing/mismatched `state`
- `/token` returns 401 without a session
- `/token` returns 200 + token for a valid session

If anything fails, the failure messages will point at the exact handler. Common issues:
- **"Invalid keyData"** during `/auth/callback` tests → the test PEM is intentionally invalid; the test stubs `fetch` so production never hits this. Re-check that your *real* PEM is what you put into `wrangler secret put GITHUB_APP_PRIVATE_KEY`.
- **`origin_not_allowed`** → your test request was missing the `Origin` header. Tests stub that in.

---

## 9. Deploy the Worker (1 min)

```bash
cd worker
wrangler deploy
```

Output ends with:
```
Published invisible-support-auth (X.XX sec)
  https://invisible-support-auth.<your-subdomain>.workers.dev
```

**Copy that URL** — it is your `WORKER_URL` for the portal.

Quick smoke test from your terminal:
```bash
curl https://invisible-support-auth.<your-subdomain>.workers.dev/health
```
Expected: `{"ok":true,"kv":"ok"}`

---

## 10. (If not already) Deploy the static portal to GitHub Pages (5 min)

If the portal is not yet live on Pages:

1. Push this repo to GitHub (if it isn't already):
   ```bash
   cd ..
   git add .
   git commit -m "Add GitHub App + Cloudflare Worker auth proxy"
   git push origin main
   ```
2. On GitHub: repo → **Settings** → **Pages**.
3. **Source**: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`.
4. Click **Save**. GitHub will build and serve at `https://<user>.github.io/<repo>/` (or `https://<user>.github.io` if the repo *is* `<user>.github.io`).
5. Wait for the green check on the Pages deployment (usually < 60 seconds).

> **No build step.** The portal is pure ES Modules in static files. There is nothing to compile.

---

## 11. Wire the portal to the Worker (2 min)

1. Open the live portal in your browser: `https://<user>.github.io/<repo>/` (or the root URL).
2. Locate the **Repository storage** card in the top row.
3. **Auth worker URL**: paste the Worker URL from Step 9.
4. **Repository owner** and **Repository name**: should auto-fill from the URL; confirm they match the storage repo. (For a custom domain, fill them in manually.)
5. **Branch**: defaults to `main`. Change if your Pages site deploys from a different branch.
6. **Storage budget (MB)**: leave blank to use the 200 MB default, or set your own.
7. Click **Save**. A green toast confirms the settings were saved locally.
8. Click **Connect GitHub**:
   - You'll be redirected to `https://github.com/apps/<your-app>/installations/new`.
   - If the App is already installed on a repo, you'll be sent to the repo-picker. Confirm or select your storage repo.
   - GitHub redirects you back to your portal with `?installation_id=<id>&state=<state>` in the URL.
   - The portal POSTs those to the Worker, the Worker mints a session, the page shows a green toast `Connected to GitHub App on <account>/<repo>`.
9. The **Repository storage** card now shows `Connected as <account>/<repo>` with a **Disconnect** button.
10. Click **Test connection** to verify the round-trip end-to-end. Expected: green toast `Connection to GitHub succeeded.`

> **If you see "origin_not_allowed" or a CORS error:** the `ALLOWED_ORIGIN` you set in `worker/wrangler.toml` (Step 7) does not exactly match the URL in your browser's address bar. Update it, re-run `wrangler deploy`, and try again.

---

## 12. First end-to-end test (3 min)

1. In the portal, drag any small file (a `.txt` or a photo) into the **Upload workflow** dropzone.
2. Watch the progress bar.
3. Once complete, the file should appear in the **Asset library** table and the storage meter at the top should update.
4. Open the storage repo on GitHub; you should see a new commit on `main` adding:
   - `uploads/documents/<id>/<filename>` (the binary)
   - `storage/documents.json` (the manifest)
5. Open the file in the browser via the **Open in new tab** button — it should serve from `raw.githubusercontent.com`.

If all of that works, **you are done.** The portal will now auto-refresh its installation token transparently forever; no PAT to rotate.

---

## 13. (Recommended) Add a CI workflow (5 min)

If you want automated tests on every push, add `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
  worker-test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ./worker } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
```

(We'll add this file in a follow-up if you want; not required for first deploy.)

---

## 14. Key rotation runbook (for later)

If the GitHub App's private key is ever compromised:

1. GitHub → App settings → **Private keys** → **Generate a private key** (new file downloads).
2. ```bash
   cd worker
   wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste the new PEM
   wrangler deploy
   ```
3. Verify: `curl https://<worker-url>/health` → `{ ok: true }`. From the portal, click **Test connection**.
4. In GitHub App settings, click **Delete** next to the old private key.

There is no downtime — old sessions continue working until their cached tokens expire (≤ 1 hour).

---

## Troubleshooting

### Symptom: "No active session. Connect GitHub in Settings." toast on every API call
- Open DevTools → Network → look at the `/token` request. If it's `401`, your session cookie is missing or expired. Click **Disconnect** in Settings, then **Connect GitHub** again.
- If it's `403 origin_not_allowed`, your `ALLOWED_ORIGIN` is wrong (Step 7).

### Symptom: "Could not start the GitHub App install flow"
- The **Auth worker URL** field is empty or unreachable. Save the form first, then click **Connect GitHub**.

### Symptom: `wrangler secret put` accepts a value but the Worker says "Missing required secret"
- The secret is stored in Cloudflare's account-level secret store, not in `wrangler.toml`. If you switch Cloudflare accounts, you must re-`put` them.
- Verify with `wrangler secret list` from inside `worker/`.

### Symptom: GitHub returns 401 when the Worker calls `/access_tokens`
- The App may have been uninstalled. Re-install from `https://github.com/settings/installations`.
- The App's permissions may have been reduced. Verify Contents = Read & write.
- The private key may not match the App. Generate a new one, `wrangler secret put GITHUB_APP_PRIVATE_KEY`, `wrangler deploy`.

### Symptom: Visual regression test fails on `github-settings.png`
- Expected on first run — the form changed. Run `npm run test:update` to regenerate baselines, then review the diff before committing.

### Symptom: Worker deploys but `/health` returns 404
- You're hitting the wrong URL. Use the one `wrangler deploy` printed.

### Symptom: `npm test` in `worker/` complains about `nodejs_compat`
- The flag is set in `worker/vitest.config.js`. Make sure you ran `npm install` in `worker/` and that the `miniflare` and `@cloudflare/vitest-pool-workers` versions are compatible. If you see a version warning, `npm i -D wrangler@latest @cloudflare/vitest-pool-workers@latest` inside `worker/`.

---

## Open follow-ups (post-deploy)

- **Custom domain for the Worker** (`auth.your-domain.com`) — uses Cloudflare for SaaS or a Workers route. Free.
- **Uptime monitoring** on `/health` — Cloudflare Workers Analytics + a Slack/Discord webhook, or `UptimeRobot` hitting `/health` every 5 min.
- **Webhook for `installation.deleted`** — proactively sign the user out instead of waiting for the next API call to 401.
- **Multi-repo support** — if you ever need the App to span more than one repo, the Worker needs a repo-picker UI in Settings and a small refactor to `auth-callback.js` (multi-installation is a session list, not a single one).

---

## Checklist (print this and tick as you go)

- [ ] Node 20+ and npm 10+ installed (`node --version`)
- [ ] Cloudflare account created at `dash.cloudflare.com`
- [ ] GitHub App created with Contents R/W, webhook off
- [ ] App ID, Client ID, Client secret, .pem key captured
- [ ] App installed on the storage repository
- [ ] `wrangler` installed globally and `wrangler login` successful
- [ ] `cd worker && npm install` completed
- [ ] `wrangler kv namespace create INSTALLATIONS` done; id pasted into `wrangler.toml`
- [ ] All 4 secrets `wrangler secret put`-ed
- [ ] `ALLOWED_ORIGIN` set in `worker/wrangler.toml`
- [ ] `npm test` in `worker/` is green
- [ ] `wrangler deploy` returned a `*.workers.dev` URL
- [ ] `curl <worker>/health` returns `{"ok":true,"kv":"ok"}`
- [ ] Static site deployed to GitHub Pages
- [ ] Portal's Settings: Auth worker URL, owner, repo, branch, budget all filled
- [ ] **Connect GitHub** flow completed; status shows `Connected as <account>/<repo>`
- [ ] **Test connection** green
- [ ] First file upload round-trips; commit appears in the storage repo
