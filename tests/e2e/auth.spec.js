// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E tests for the GitHub App auth flow.
 *
 * These tests stub the Worker's endpoints at the network layer (via
 * `page.route`) so we can exercise the UI without standing up a real
 * Cloudflare Worker. They cover the "not connected → connect → connected"
 * transition and the unauthenticated gate banner.
 */

const WORKER_URL = 'https://auth.test.workers.dev';

async function stubWorker(page) {
  await page.route(`${WORKER_URL}/auth/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        account: 'octo',
        repo: 'cat',
        installationId: '42',
        installedAt: new Date().toISOString(),
      }),
      headers: { 'Access-Control-Allow-Origin': 'http://localhost:8080' },
    });
  });
  await page.route(`${WORKER_URL}/token`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'ghs_stub',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      }),
      headers: { 'Access-Control-Allow-Origin': 'http://localhost:8080' },
    });
  });
  await page.route(`${WORKER_URL}/auth/signout`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
      headers: { 'Access-Control-Allow-Origin': 'http://localhost:8080' },
    });
  });
}

test.describe('GitHub App auth flow', () => {
  test.beforeEach(async ({ page }) => {
    await stubWorker(page);
  });

  test('shows the not-connected banner when the Worker reports no session', async ({ page }) => {
    await page.route(`${WORKER_URL}/auth/me`, async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'unauthorized' }),
        headers: { 'Access-Control-Allow-Origin': 'http://localhost:8080' },
      });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const banner = page.locator('[data-auth-banner]');
    await expect(banner).toBeVisible();
  });

  test('hides the banner and shows the connected repo when the Worker returns a session', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const banner = page.locator('[data-auth-banner]');
    await expect(banner).toBeHidden();
    const summary = page.locator('[data-github-connection-value]');
    await expect(summary).toHaveText('octo/cat');
  });

  test('disables the PAT field and exposes the connect button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Legacy token input must no longer exist.
    await expect(page.locator('[data-github-token]')).toHaveCount(0);
    await expect(page.locator('[data-github-connect]')).toBeVisible();
  });

  test('clicking Connect begins the install flow at the Worker URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Set the worker URL via the UI first.
    const workerInput = page.locator('[data-github-worker-url]');
    await workerInput.fill(WORKER_URL);
    await page.locator('[data-github-settings] button[type="submit"]').click();

    // Stub the navigation to the Worker's /auth/install URL.
    await page.route(`${WORKER_URL}/auth/install`, async (route) => {
      await route.fulfill({
        status: 302,
        headers: { Location: 'https://github.com/apps/test/installations/new' },
      });
    });

    const [nav] = await Promise.all([
      page.waitForRequest((req) => req.url().startsWith(`${WORKER_URL}/auth/install`)),
      page.locator('[data-github-connect]').click(),
    ]);
    expect(nav.url()).toBe(`${WORKER_URL}/auth/install`);
  });
});
