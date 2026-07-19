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
});
