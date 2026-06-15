# Repository Setup Guide

Follow these steps to connect the Invisible Support Portal to a GitHub repository for persistent storage, and to deploy the Cloudflare Worker that mints short-lived installation tokens.

## 1. Prepare the GitHub Repository
1. Navigate to the repository that serves your GitHub Pages site.
2. Confirm which branch backs Pages (commonly `main`). The configuration form defaults to `main`, but you can target any branch that accepts commits.
3. Auto-merge can remain enabled; no additional branch protections are required for the client-side workflow.

## 2. Create a GitHub App
This portal authenticates with a **GitHub App**, not a Personal Access Token. The App is owned by you (one-time setup) and fronted by a Cloudflare Worker that mints short-lived installation tokens on demand.

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Fill in the form:
   - **GitHub App name**: `Invisible Support Portal` (must be unique).
   - **Homepage URL**: `https://<github-pages-host>` (your Pages URL).
   - **Callback URL**: `https://<worker-host>/auth/callback` (use the deployed Worker URL from Step 3; you can also use a temporary placeholder and update it after deploy).
   - **Webhook**: ❌ Uncheck "Active" — this flow doesn't use webhooks.
3. **Repository permissions**:
   - `Contents`: **Read and write**
   - `Metadata**: **Read-only** (default)
4. **Where can this App be installed?**: "Only on this account" (single-repo model).
5. Click **Create GitHub App**.
6. On the App's settings page, note:
   - **App ID** (numeric) — needed for the Worker's `GITHUB_APP_ID` secret.
   - **Client ID** (top of page) — needed for `GITHUB_APP_CLIENT_ID`.
7. Click **Generate a new client secret** and copy the value — `GITHUB_APP_CLIENT_SECRET`.
8. Scroll to **Private keys** and click **Generate a private key**. A `.pem` file downloads. You'll paste its contents into the Worker as `GITHUB_APP_PRIVATE_KEY`.
9. In the sidebar, click **Install App** and install the App on the repository that backs the portal.

> **Security note:** The App's private key is stored only in Cloudflare Worker secrets. It is never bundled with the static site.

## 3. Deploy the Auth Worker
The Worker signs GitHub App JWTs and mints installation tokens. See [`worker/README.md`](./worker/README.md) for the full runbook. Quick version:

```bash
# One-time: install the Wrangler CLI and log in
npm install -g wrangler
wrangler login

# In the worker/ directory
cd worker
npm install
wrangler kv namespace create INSTALLATIONS
# Copy the returned id into worker/wrangler.toml under [[kv_namespaces]].

# Set secrets
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_APP_CLIENT_ID
wrangler secret put GITHUB_APP_CLIENT_SECRET
wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste the full PEM, including BEGIN/END lines

# Set the allowed origin (your GitHub Pages URL) in wrangler.toml under [vars]
# ALLOWED_ORIGIN = "https://<user>.github.io"

wrangler deploy
```

Note the deployed Worker URL (e.g. `https://invisible-support-auth.<sub>.workers.dev`). The portal will call it for every REST request.

## 4. Configure the Portal
1. Open the deployed portal and locate the **Repository storage** card in the right column.
2. If the site is loaded from GitHub Pages, the **Owner** and **Repository** inputs auto-fill using the current URL. Confirm the values match the repository that backs the site; adjust them if you are using a custom domain or a different project.
3. Paste the **Auth worker URL** from Step 3 into the corresponding field.
4. Click **Save**.
5. Click **Connect GitHub**. You'll be redirected to GitHub to install (or re-confirm) the App on the target repository. After approving, you're returned to the portal; the connection status should now show the connected repo and account.
6. Click **Test connection** to verify the Worker can mint tokens and the App has the right permissions.

> **What this app does not accept:** Personal access tokens of any kind (classic or fine-grained). The PAT text field has been removed; any attempt to set one via `updateConfig()` is rejected by the service layer.

## 5. Verify Repository Structure
After the first successful upload, the portal will create:
- `storage/documents.json` and/or `storage/images.json` manifests containing metadata.
- `uploads/documents/<id>/...` and `uploads/images/<id>/...` folders that hold the binary assets.

You can monitor commits in the repository history to audit uploads and removals.

## 6. Ongoing Maintenance
- **Token rotation is automatic.** The Worker re-mints installation tokens ~1 hour before expiry; the browser fetches a fresh token per request. There is no manual rotation.
- **If the App's private key is compromised:** rotate it (see [`worker/README.md`](./worker/README.md#key-rotation-runbook)). This is a rare event but the runbook walks through it.
- **If the App install is uninstalled:** the Worker returns 401; the portal shows a "Connect GitHub" banner. Re-install the App on the same repo (Settings → Applications → Configure → Install).
- **If you change the branch or rename the repository:** update the settings card and re-run **Test connection**.

With these steps complete, the portal will persist uploads directly to the repository, with no manual credential management.
