import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Parallel: per-worker isoliert via E2E-Test-Scoring-W{N} GameDay + Year 2099+N Season.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    // Animations off → schneller + reduziert flakiness durch transition timing
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml',
      url: 'http://localhost:8080/actuator/health',
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npx vite',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})
