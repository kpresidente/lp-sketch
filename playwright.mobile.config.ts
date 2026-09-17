import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

const PORT = 4174
const BASE_URL = `http://127.0.0.1:${PORT}`

// Exercise packaged web assets at tablet size. Chromium is not an iOS simulator;
// native APIs still require the installed iPad application.
export default defineConfig({
  ...base,
  testMatch: 'smoke.spec.ts',
  use: { ...base.use, baseURL: BASE_URL },
  webServer: {
    command: `npm run mobile:preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{
    name: 'mobile-web-chromium',
    use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 1024 } },
  }],
})
