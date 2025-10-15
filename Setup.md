# Repository Setup Guide

Follow these steps to connect the Invisible Support Portal to a GitHub repository for persistent storage.

## 1. Prepare the GitHub Repository
1. Navigate to the repository that serves your GitHub Pages site.
2. Confirm which branch backs Pages (commonly `main`). The configuration form defaults to `main`, but you can target any branch that accepts commits.
3. Ensure the repository allows commits from the account that will upload assets. Auto-merge can remain enabled; no additional branch protections are required for the client-side workflow.

## 2. Create a Personal Access Token (PAT)
1. From GitHub, open **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Choose **Generate new token (classic)**.
3. Provide a descriptive name (e.g., `InvisibleSupportUploader`).
4. Set an appropriate expiration (short-lived tokens are safer; refresh as needed).
5. Enable the **repo** scope. This grants the token permission to read and write repository contents.
6. Generate the token and copy it immediately. GitHub will not display it again.

> **Security note:** The token is stored in the browser’s `localStorage` so the portal can authenticate requests. Treat the device as trusted, and revoke/regenerate the token if it is ever exposed.

## 3. Configure the Portal
1. Open the deployed portal and locate the **Repository storage** card in the right column.
2. If the site is loaded from GitHub Pages, the **Owner** and **Repository** inputs auto-fill using the current URL. Confirm the values match the repository that backs the site; adjust them if you are using a custom domain or a different project.
3. Enter (or confirm) the repository **owner**, **repository** name, and the branch that should receive uploads.
4. Paste the PAT into the **Personal access token** field.
5. Optionally set a **Storage budget (MB)** to enforce a soft cap on repository usage. Leave blank to keep the previous limit (defaults to 200 MB).
6. Click **Save**. A toast confirms that the configuration is stored locally.
7. Use **Test connection** to verify credentials. Successful tests confirm the app can write to the repository; failures usually indicate an incorrect owner/repo, branch, or token scope.

## 4. Verify Repository Structure
After the first successful upload, the portal will create:
- `storage/documents.json` and/or `storage/images.json` manifests containing metadata.
- `uploads/documents/<id>/...` and `uploads/images/<id>/...` folders that hold the binary assets.

You can monitor commits in the repository history to audit uploads and removals.

## 5. Ongoing Maintenance
- Rotate the PAT periodically or when contributors change.
- Use the in-app delete actions (or the browser console helpers) to remove assets, which also cleans up the manifest and uploaded files.
- If you change the branch or rename the repository, update the settings card and re-run **Test connection**.

With these steps complete, the portal will persist uploads directly to the repository, making assets available to anyone with access to your GitHub Pages site.
