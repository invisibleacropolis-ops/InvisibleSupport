// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Supabase auth UI', () => {
  test('shows the Supabase settings controls when signed out', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The sign-in banner was removed; the settings panel is the sole surface
    // for connection state on this single-user site.
    await expect(page.locator('[data-auth-banner]')).toHaveCount(0);
    await expect(page.locator('[data-supabase-settings]')).toBeVisible();
    await expect(page.locator('[data-supabase-email]')).toBeVisible();
    await expect(page.locator('[data-supabase-signin]')).toBeVisible();
    await expect(page.locator('[data-supabase-project-value]')).toContainText('guoyqsfvqllyhlsrknml.supabase.co');
    await expect(page.locator('[data-supabase-connection-value]')).toContainText('signed out');
    await expect(page.locator('[data-github-connect]')).toHaveCount(0);
    await expect(page.locator('[data-github-worker-url]')).toHaveCount(0);
  });

  test('enables magic-link sign-in and keeps storage test gated until signed in', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-supabase-signin]')).toBeEnabled();
    await expect(page.locator('[data-supabase-test]')).toBeDisabled();
  });

  test('does not impose a portal upload or storage limit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-supabase-limit]')).toHaveCount(0);
    await expect(page.locator('[data-storage-limit]')).toHaveText('No portal limit');

    const storagePolicy = await page.evaluate(async () => {
      const manager = await import('/src/shared/services/storage-manager.js');
      return {
        canStoreLargeFile: manager.canStore(Number.MAX_SAFE_INTEGER),
        remainingCapacity: manager.getRemainingCapacity(),
        limit: manager.getSnapshot().limit,
      };
    });

    expect(storagePolicy).toEqual({
      canStoreLargeFile: true,
      remainingCapacity: Number.POSITIVE_INFINITY,
      limit: null,
    });
  });
});
