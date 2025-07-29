const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false, // Run tests sequentially since they share ports
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid port conflicts
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:9000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        // Required for SharedArrayBuffer
        launchOptions: {
          args: [
            '--enable-features=SharedArrayBuffer',
            '--cross-origin-isolation',
          ]
        }
      },
    },
  ],

  // Run servers before tests
  webServer: [
    {
      command: 'node relay-server.js',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node test-server.js',
      port: 9000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});