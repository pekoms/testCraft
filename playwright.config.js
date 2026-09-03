import { defineConfig, devices } from '@playwright/test'

// Port 5174 so E2E server never conflicts with the normal dev server (5173).
// Mode "e2e" loads .env.e2e which clears Supabase vars → supabase=null → dev/teacher mode.
const E2E_URL = 'http://localhost:5174/testCraft/'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    headless: true,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npx vite --mode e2e --port 5174',
    url: E2E_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
