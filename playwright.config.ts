import { defineConfig, devices } from '@playwright/test'

// Override when another project holds the default port; a foreign server on the port
// would otherwise be reused and tested (gotoApp also checks the page title).
const PORT = Number(process.env.LP_E2E_PORT ?? 4173)
const BASE_URL = `http://127.0.0.1:${PORT}`
const isWindows = process.platform === 'win32'

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/*.mobile.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI || isWindows ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
