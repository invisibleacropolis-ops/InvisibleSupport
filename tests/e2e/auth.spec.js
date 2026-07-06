// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Supabase auth UI', () => {
  test('shows the signed-out banner and Supabase settings controls', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-auth-banner]')).toBeVisible();
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
