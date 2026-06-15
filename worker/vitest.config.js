import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: '@cloudflare/vitest-pool-workers/config',
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          compatibilityFlags: ['nodejs_compat'],
          bindings: {
            INSTALLATIONS: 'INSTALLATIONS',
          },
        },
      },
    },
  },
});
