import { defineConfig, devices } from '@playwright/test'

// Test environment from e2e/.env (copy .env.example). server/.env is never used here.
process.loadEnvFile(new URL('.env', import.meta.url))

// Own ports, so the tests run next to `bun run dev` (3000/5173) without touching it or its database.
const API_PORT = 3100
const CLIENT_PORT = 5174
const baseURL = `http://localhost:${CLIENT_PORT}`

const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'] as const
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} must be set in e2e/.env (see e2e/.env.example).`)
}

const serverEnv = {
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  BETTER_AUTH_URL: `http://localhost:${API_PORT}`,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
  PORT: String(API_PORT),
  // Not "production": the rate limiter stays off (server/src/auth/auth.ts), so tests can sign in repeatedly.
  NODE_ENV: 'test',
}

export default defineConfig({
  testDir: './tests',
  // One database shared by all tests: run them one at a time so they can't interfere.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Never reuse a running server: it could be connected to the development database.
  webServer: [
    {
      name: 'api',
      // Rebuild the test database from the migrations, then start the API against it.
      command: 'bun --no-env-file prepare-db.ts && cd ../server && bun --no-env-file src/index.ts',
      env: serverEnv,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      stdout: 'pipe',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 },
    },
    {
      name: 'client',
      cwd: '../client',
      command: `bunx --bun vite --port ${CLIENT_PORT} --strictPort`,
      // Vite proxies /api to the test API instead of the dev server (client/vite.config.ts).
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      url: baseURL,
      reuseExistingServer: false,
    },
  ],
})
