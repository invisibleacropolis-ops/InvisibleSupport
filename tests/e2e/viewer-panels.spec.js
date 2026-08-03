// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Viewer panels', () => {
  test('keeps the image and document viewers expanded without panel toggles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const imageViewer = page.locator('article[aria-labelledby="image-viewer"]');
    const documentViewer = page.locator('article[aria-labelledby="document-viewer"]');

    await expect(imageViewer).toBeVisible();
    await expect(documentViewer).toBeVisible();
    await expect(imageViewer).not.toHaveClass(/\bis-collapsed\b/);
    await expect(documentViewer).not.toHaveClass(/\bis-collapsed\b/);
    await expect(imageViewer.locator('[data-panel-toggle]')).toHaveCount(0);
    await expect(documentViewer.locator('[data-panel-toggle]')).toHaveCount(0);
  });

  test('caps collection panels to their viewers and preserves horizontal resizing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const pairs = [
      {
        split: page.locator('[data-split-id="img-split"]'),
        collection: page.locator('article[aria-labelledby="image-gallery"]'),
        viewer: page.locator('article[aria-labelledby="image-viewer"]'),
        scrollRegion: page.locator('[data-image-gallery-items]'),
      },
      {
        split: page.locator('[data-split-id="doc-split"]'),
        collection: page.locator('article[aria-labelledby="asset-library"]'),
        viewer: page.locator('article[aria-labelledby="document-viewer"]'),
        scrollRegion: page.locator('.library-card__table'),
      },
    ];

    for (const pair of pairs) {
      await expect.poll(async () => {
        const collectionBox = await pair.collection.boundingBox();
        const viewerBox = await pair.viewer.boundingBox();
        return Math.abs((collectionBox?.height ?? 0) - (viewerBox?.height ?? 0));
      }).toBeLessThanOrEqual(1);

      await expect.poll(async () => pair.scrollRegion.evaluate(
        element => getComputedStyle(element).overflowY
      )).toBe('auto');

      const handle = pair.split.locator('[data-split-handle]');
      const initialPosition = Number(await handle.getAttribute('aria-valuenow'));
      const initialCollectionWidth = (await pair.collection.boundingBox())?.width ?? 0;

      await handle.focus();
      await handle.press('ArrowRight');

      await expect(handle).toHaveAttribute('aria-valuenow', String(initialPosition + 1));
      await expect.poll(async () => (await pair.collection.boundingBox())?.width ?? 0)
        .toBeGreaterThan(initialCollectionWidth);

      const widthAfterKeyboardResize = (await pair.collection.boundingBox())?.width ?? 0;
      const handleBox = await handle.boundingBox();
      if (!handleBox) throw new Error('Expected the horizontal split handle to be visible');

      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2 + 40, handleBox.y + handleBox.height / 2);
      await page.mouse.up();

      await expect.poll(async () => (await pair.collection.boundingBox())?.width ?? 0)
        .toBeGreaterThan(widthAfterKeyboardResize);

      await expect.poll(async () => {
        const collectionBox = await pair.collection.boundingBox();
        const viewerBox = await pair.viewer.boundingBox();
        return Math.abs((collectionBox?.height ?? 0) - (viewerBox?.height ?? 0));
      }).toBeLessThanOrEqual(1);
    }
  });
});
