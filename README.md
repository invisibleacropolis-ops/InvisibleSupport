# Invisible Support Portal

## Architecture Overview
The portal is a single-page application delivered through `index.html`. All presentation, state, and behavior live in this document:

- **Layout** – Document and image workflows share a cohesive CSS token system plus reusable utility classes for cards, modals, and tables.
- **Interaction layer** – Vanilla JavaScript modules (IIFE namespaces) coordinate localization, storage, notifications, library/gallery rendering, and viewer synchronization without external dependencies.
- **Accessibility** – Focus management, ARIA attributes, and live regions ensure uploads, storage warnings, and clipboard actions remain screen-reader friendly.

The script bootstraps a lightweight module system inside the page, keeping concerns separated by feature (e.g., `StorageManager`, `DocumentStore`, `ImageStore`, `DocumentViewer`, `ImageGallery`).

## Data Persistence Model
Persistent state is stored entirely in `localStorage` under two keys managed by `StorageManager`:

| Store | Key | Shape |
| --- | --- | --- |
| Documents | `invisibleSupport.documents` | Array of document records `{ id, name, title, description, type, size, updatedAt, dataUrl }` |
| Images | `invisibleSupport.images` | Array of image records `{ id, name, title, alt, type, size, width, height, updatedAt, capturedAt, exif, dataUrl }` |

Transient-only properties (`blobUrl`) are rebuilt at runtime from the persisted Data URLs. This keeps the storage footprint low while supporting inline previews and direct-link actions.

`StorageManager` tracks estimated byte usage per key to drive the storage meter UI, enforce a 4.5 MB quota heuristic, and surface quota warnings before writes occur.

## Blob-Based Direct Links
Direct links rely on `URL.createObjectURL` to issue temporary blob URLs scoped to the current browsing context. Keep in mind:

- **Lifecycle** – Blob URLs are revoked explicitly whenever items are removed or cleared, and they are rebuilt on load. Refreshing the page invalidates previously shared URLs.
- **Scope** – Links only resolve within the same device/profile. Sharing them externally or across browsers fails once the originating tab revokes or exits.
- **Memory management** – Aggressive revocation prevents long-running sessions from leaking memory when large assets churn frequently.

Treat blob URLs as ephemeral handles for viewing/downloading, not stable shareable URLs.

## Storage Schema Details
Documents and images share common metadata plus workflow-specific fields:

### Document Records
- `id` – Stable unique identifier (`crypto.randomUUID` fallback) used for selections.
- `name` – File name, de-duplicated via suffixes to avoid collisions in the library table.
- `title` / `description` – User-provided metadata rendered in the library and viewer sidebar.
- `type` – MIME type used for preview support checks and download hints.
- `size` – Raw file size informing the metadata panel.
- `updatedAt` – ISO string representing the last mutation time and used for sorting.
- `dataUrl` – Base64 serialized payload persisted in `localStorage`.

### Image Records
- All document fields plus:
  - `alt` – Accessibility description surfaced in gallery tiles.
  - `width` / `height` – Pixel dimensions shown in metadata rows.
  - `capturedAt` – Derived EXIF capture date when available.
  - `exif` – Parsed EXIF object (make, model, ISO, shutter speed, etc.) for the metadata inspector.

## Operational Runbooks
Future engineers can use the built-in modules to maintain the experience:

### Reset the Libraries
1. Open the portal and trigger the storage dialog (`Manage stored data`).
2. Click **Clear all stored items** to wipe documents, images, and tracked sizes.
3. The UI dispatches `DocumentStore.clearAll()` and `ImageStore.clearAll()`, revoking blob URLs and refreshing the UI.

### Clear Storage Programmatically
Use the helper functions from the console:

```js
StorageManager.clearAll();      // Removes localStorage keys and resets usage tracking
DocumentStore.clearAll();       // Clears document entries and revokes blob URLs
ImageStore.clearAll();          // Clears image entries and revokes blob URLs
```

Run them together to emulate the dialog's behavior during automated tests or manual resets.

### Add New Asset Types
1. Extend the relevant store (e.g., create `AudioStore`) mirroring the `DocumentStore`/`ImageStore` shape:
   - Persist minimal metadata plus a Data URL.
   - Rebuild blob URLs on hydrate to keep previews responsive.
2. Update the UI rendering module to surface metadata, preview support, and direct-link controls.
3. Register the store with `StorageManager` to track quota impact and subscribe to updates for the storage meter.
4. Expose runbook actions (clear, remove) and update documentation with schema differences.

When accepting new MIME types, enforce validation similar to `isSupportedImageType` and consider dimension/length guardrails to protect storage capacity.

## Developer Notes
- Inline comments mark complex parsing, quota calculation, and normalization logic—use them as anchors when extending functionality.
- Run `npx html-validate index.html` to lint markup structure before committing changes.
- `StorageManager` estimates base64 overhead via a 1.37 multiplier; adjust cautiously if the quota strategy evolves.
