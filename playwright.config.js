// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Visual Regression Testing configuration for the Monolith-to-VSA refactor.
 * This safety net ensures pixel-perfect fidelity during the migration.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/visual',
  
  // Snapshot naming template for organized baseline storage
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
  
  // Expect configuration for visual comparison
  expect: {
    toHaveScreenshot: {
      // Allow tiny anti-aliasing differences
      maxDiffPixels: 50,
      threshold: 0.1,
    },
  },
  
  // Global settings
  fullyParallel: false, // Run serially for consistent snapshots
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for deterministic screenshots
  reporter: 'html',
  
  use: {
    // Base URL for the local server
    baseURL: 'http://localhost:8080',
    
    // Capture trace on first retry for debugging
    trace: 'on-first-retry',
    
    // Strict viewport locking for consistent screenshots
    viewport: { width: 1280, height: 720 },
    
    // Reasonable timeout for actions
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit optional for initial refactor speed
  ],

  // Run a local server before tests
  webServer: {
    command: 'npx http-server . -p 8080 -c-1',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
