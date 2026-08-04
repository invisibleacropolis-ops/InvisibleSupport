// @ts-check
import { test, expect } from '@playwright/test';
import path from 'node:path';

const realVideoPath = process.env.REAL_VIDEO_PATH;

test('a real video file clears the uncapped portal upload layer', async ({ page }) => {
  test.skip(!realVideoPath, 'Set REAL_VIDEO_PATH to run the real-file upload boundary check.');
  if (!realVideoPath) return;

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const form = page.locator('[data-video-upload-form]');
  await form.locator('[data-media-file-input]').setInputFiles(realVideoPath);
  await expect(form.locator('[data-media-queue-summary]')).toContainText(path.basename(realVideoPath));
  await expect(page.locator('[data-storage-limit]')).toHaveText('No portal limit');

  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[data-media-feedback]')).toContainText(
    'Configure Supabase storage and sign in before uploading.'
  );
});
