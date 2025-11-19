// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run client',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  }
});
