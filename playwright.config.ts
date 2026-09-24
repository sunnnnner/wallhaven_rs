import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:1425',
    viewport: { width: 1280, height: 800 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome' },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 1425',
    url: 'http://127.0.0.1:1425',
    reuseExistingServer: false,
  },
})
