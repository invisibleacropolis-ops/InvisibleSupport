# Invisible Support Portal

## Architecture Overview
The portal ships as a single `index.html` file that combines layout, styling, and behavior via vanilla JavaScript modules (IIFE namespaces). Key layers include:

- **UI system** – Two-column layout, reusable card utilities, and responsive gallery/library components keep the experience consistent.
- **Integration layer** – Modules such as `GitHubIntegration`, `StorageManager`, `DocumentStore`, and `ImageStore` orchestrate persistence, quota tracking, localization, and viewer synchronization without external dependencies.
- **Accessibility** – Focus management, ARIA roles, and live regions surface upload status, quota warnings, and clipboard confirmations for assistive technology users.

## Repository-Backed Persistence
Uploads persist to the GitHub repository that hosts the site. When the portal is served from GitHub Pages, the **Repository storage** card automatically pre-populates the owner and repository fields based on the current URL so you only need to supply authentication details. Configuration happens through the **Repository storage** card in the UI, which stores credentials in `localStorage` for client-side API calls and drives the following workflow:

| Store | Manifest path | Shape |
| --- | --- | --- |
| Documents | `storage/documents.json` | `{ id, name, title, description, type, size, updatedAt, repoPath, sha, downloadUrl }[]` |
| Images | `storage/images.json` | `{ id, name, title, alt, type, size, width, height, updatedAt, capturedAt, exif, repoPath, sha, downloadUrl }[]` |

`GitHubIntegration` commits both manifests and the uploaded binaries:

- Files land under `uploads/documents/<id>/<filename>` and `uploads/images/<id>/<filename>`.
- Each commit stores the blob SHA plus a shareable `download_url`, which powers direct links and previews.
- `StorageManager` aggregates record sizes to enforce the configured storage budget.

Because the data lives in GitHub, refreshing the page or loading the site from another device rehydrates the library and gallery from the manifests.

## Direct Links & Caching
Direct-link inputs now point to GitHub’s raw content endpoints (e.g., `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/uploads/...`). These URLs remain stable until the underlying asset is removed. Previews stream directly from the raw asset; there is no longer a dependency on ephemeral `blob:` URLs.

## Operational Runbooks
### Configure Repository Access
1. Open the **Repository storage** card in the secondary column.
2. Enter the repository owner, repository name, target branch, personal access token (with `repo` scope), and an optional storage limit in MB.
3. Save the configuration, then run **Test connection** to verify credentials. Successful tests trigger a confirmation toast.

### Reset the Libraries
Uploading or removing items updates GitHub immediately. To reset the experience:
1. Remove documents or images from the UI (each delete issues a `DELETE /contents/...` request).
2. Alternatively, delete the manifest files (`storage/documents.json`, `storage/images.json`) and their corresponding `uploads/...` folders directly in GitHub.

### Programmatic Maintenance
The browser console exposes the same helpers used by the UI:

```js
await DocumentStore.clearAll();   // Deletes document files and manifest entries
await ImageStore.clearAll();       // Deletes image files and manifest entries
await StorageManager.clearAll();   // Removes manifests and resets quota tracking
```

## Developer Notes
- `GitHubSettings` surfaces inline validation and mirrors the persisted configuration from `GitHubIntegration`.
- Run `npx html-validate index.html` before committing to spot markup regressions (some legacy warnings may remain).
- Large uploads are throttled through the storage budget defined in the settings card; adjust the limit there during testing.
- The codebase avoids bundlers, so keep additions dependency-free and prefer IIFE modules for new functionality.

For detailed setup instructions (including PAT creation and repository settings), see `Setup.md`.
