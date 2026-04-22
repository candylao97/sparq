import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Sparq Admin — Playwright configuration
 *
 * Test isolation strategy:
 *  - Each worker gets its own DB transaction (rolled back after test)
 *  - Auth state is persisted per-role in storageState files
 *  - Stripe webhooks use the Stripe CLI --forward-to flag in CI
 */

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,
  reporter: [
    ['html', { outputFolder: '../../test-results/html', open: 'never' }],
    ['json', { outputFile: '../../test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    // ── Auth setup (runs once, saves cookies per role) ──
    {
      name: 'setup:admin',
      // auth.setup.ts is in fixtures/ not specs/ — use absolute testMatch
      testMatch: '**/fixtures/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Full browser tests ──
    {
      name: 'admin-chrome',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup:admin'],
      testIgnore: ['**/api/**', '**/webhooks/**'],
    },
    {
      name: 'ops-chrome',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/ops.json'),
      },
      dependencies: ['setup:admin'],
      testMatch: ['**/rbac.spec.ts'],
    },
    {
      name: 'support-chrome',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/support.json'),
      },
      dependencies: ['setup:admin'],
      testMatch: ['**/rbac.spec.ts'],
    },

    // ── API-only (no browser) ──
    {
      name: 'api',
      testMatch: ['**/api/**', '**/webhooks/**'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Next.js dev server automatically in local mode
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
