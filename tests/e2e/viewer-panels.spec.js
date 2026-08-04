// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Viewer panels', () => {
  test('keeps the image, document, and audio viewers expanded without panel toggles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const imageViewer = page.locator('article[aria-labelledby="image-viewer"]');
    const documentViewer = page.locator('article[aria-labelledby="document-viewer"]');
    const audioPlayer = page.locator('article[aria-labelledby="audio-player"]');

    await expect(imageViewer).toBeVisible();
    await expect(documentViewer).toBeVisible();
    await expect(audioPlayer).toBeVisible();
    await expect(imageViewer).not.toHaveClass(/\bis-collapsed\b/);
    await expect(documentViewer).not.toHaveClass(/\bis-collapsed\b/);
    await expect(audioPlayer).not.toHaveClass(/\bis-collapsed\b/);
    await expect(imageViewer.locator('[data-panel-toggle]')).toHaveCount(0);
    await expect(documentViewer.locator('[data-panel-toggle]')).toHaveCount(0);
    await expect(audioPlayer.locator('[data-panel-toggle]')).toHaveCount(0);
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
      {
        split: page.locator('[data-split-id="audio-split"]'),
        collection: page.locator('article[aria-labelledby="audio-library"]'),
        viewer: page.locator('article[aria-labelledby="audio-player"]'),
        scrollRegion: page.locator('[data-audio-library-items]'),
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

  test('provides native audio transport and an optional playlist queue', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const player = page.locator('article[aria-labelledby="audio-player"]');
    const audio = player.locator('[data-audio-element]');
    const playlistToggle = player.locator('[data-audio-playlist-enabled]');
    const playlistLoop = player.locator('[data-audio-loop] option[value="playlist"]');
    const queue = player.locator('[data-audio-queue]');

    await expect(audio).toHaveAttribute('controls', '');
    await expect(audio).toHaveAttribute('preload', 'metadata');
    await expect(playlistToggle).not.toBeChecked();
    await expect(playlistLoop).toHaveAttribute('disabled', '');
    await expect(queue).toBeHidden();

    await playlistToggle.check();

    await expect(playlistToggle).toBeChecked();
    await expect(playlistLoop).not.toHaveAttribute('disabled', '');
    await expect(queue).toBeVisible();
    await expect(queue.locator('[data-audio-queue-count]')).toHaveText('0 queued');

    await player.locator('[data-audio-loop]').selectOption('playlist');
    await expect(player.locator('[data-audio-loop]')).toHaveValue('playlist');

    await playlistToggle.uncheck();

    await expect(queue).toBeHidden();
    await expect(playlistLoop).toHaveAttribute('disabled', '');
    await expect(player.locator('[data-audio-loop]')).toHaveValue('off');
  });
});
