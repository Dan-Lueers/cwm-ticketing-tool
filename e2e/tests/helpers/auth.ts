// Shared sign-in helpers and the users seeded by e2e/prepare-db.ts (credentials come from e2e/.env).
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export type TestUser = { email: string; password: string; name: string; role: 'admin' | 'agent' }

function env(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`${key} must be set in e2e/.env (see e2e/.env.example).`)
  return value
}

// Names match the seed: server/src/db/seed.ts (admin) and e2e/prepare-db.ts (agent).
export const admin: TestUser = { email: env('ADMIN_EMAIL'), password: env('ADMIN_PASSWORD'), name: 'Admin', role: 'admin' }
export const agent: TestUser = {
  email: env('AGENT_EMAIL'),
  password: env('AGENT_PASSWORD'),
  name: 'Test Agent',
  role: 'agent',
}

/** The client's origin (Vite, which proxies /api to the test API). Better Auth trusts it outside production. */
export const appOrigin = 'http://localhost:5174'

/**
 * Headers a browser on the app's own origin would send. Playwright's API requests send no Origin by default;
 * Better Auth checks it on state-changing requests, so API calls that should succeed say where they come from.
 */
export const sameOrigin = { Origin: appOrigin }

/** Signs in through the login form and waits for the home page. */
export async function signInWithForm(page: Page, user: TestUser) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible()
}

/**
 * Signs in through the API. Pass `page.request` / `context.request` to sign the browser context in (they share its
 * cookies); faster than the form for tests that aren't about the login page.
 */
export async function signInWithApi(request: APIRequestContext, user: TestUser) {
  const response = await request.post('/api/auth/sign-in/email', {
    headers: sameOrigin,
    data: { email: user.email, password: user.password },
  })
  expect(response.status(), await response.text()).toBe(200)
}


/** Signs out with the nav bar's button and waits for the login page. */
export async function signOutWithUi(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
}

/** Signs out through the API. Pass `page.request` / `context.request` to end the browser context's session. */
export async function signOutWithApi(request: APIRequestContext) {
  const response = await request.post('/api/auth/sign-out', { headers: sameOrigin })
  expect(response.status(), await response.text()).toBe(200)
}
