import { expect, test, type Page } from '@playwright/test'
import { admin, agent, signInWithForm } from './helpers/auth.ts'

const signInPath = '/api/auth/sign-in/email'

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Collects the sign-in requests the page sends, to check that client-side validation blocks them. */
function trackSignInRequests(page: Page) {
  const urls: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === signInPath) urls.push(request.url())
  })
  return urls
}

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  // The "Sign in" title is a <div> (shadcn CardTitle), not a heading, so the submit button identifies the page.
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

for (const user of [admin, agent]) {
  test(`${user.role} signs in and lands on the home page`, async ({ page }) => {
    await fillLogin(page, user.email, user.password)

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible()
    const nav = page.getByRole('banner')
    await expect(nav.getByText(user.name)).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })
}

test('the email is case-insensitive', async ({ page }) => {
  await fillLogin(page, admin.email.toUpperCase(), admin.password)

  await expect(page.getByRole('heading', { name: `Welcome, ${admin.name}` })).toBeVisible()
})

test('a wrong password and an unknown email get the same error', async ({ page }) => {
  await fillLogin(page, admin.email, `${admin.password}-wrong`)
  const alert = page.getByRole('alert')
  await expect(alert).toHaveText('Invalid email or password')
  await expect(page).toHaveURL('/login')

  // Same message for an address that doesn't exist, so the form doesn't reveal which emails have accounts.
  await fillLogin(page, `nobody-${crypto.randomUUID()}@example.com`, admin.password)
  await expect(alert).toHaveText('Invalid email or password')
  await expect(page).toHaveURL('/login')
})

test('empty fields show validation errors and send no request', async ({ page }) => {
  const requests = trackSignInRequests(page)

  await page.getByRole('button', { name: 'Sign in' }).click()

  const email = page.getByLabel('Email')
  const password = page.getByLabel('Password')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Enter a valid email address')
  await expect(password).toHaveAttribute('aria-invalid', 'true')
  await expect(password).toHaveAccessibleDescription('Enter your password')
  await expect(page).toHaveURL('/login')
  expect(requests).toEqual([])
})

test('an invalid email format shows an error and sends no request', async ({ page }) => {
  const requests = trackSignInRequests(page)

  await fillLogin(page, 'not-an-email', admin.password)

  const email = page.getByLabel('Email')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Enter a valid email address')
  await expect(page.getByLabel('Password')).toHaveAttribute('aria-invalid', 'false')
  expect(requests).toEqual([])

  // Fixing the field clears the error and the form signs in.
  await page.getByLabel('Email').fill(admin.email)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: `Welcome, ${admin.name}` })).toBeVisible()
})

test('the submit button is disabled and says "Signing in…" while the request is pending', async ({ page }) => {
  // Hold the sign-in request until the pending state has been checked.
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  await page.route(`**${signInPath}`, async (route) => {
    await released
    await route.continue()
  })

  await fillLogin(page, agent.email, agent.password)

  const pending = page.getByRole('button', { name: 'Signing in…' })
  await expect(pending).toBeVisible()
  await expect(pending).toBeDisabled()

  release()
  await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
})

test('a network failure shows an error and re-enables the form', async ({ page }) => {
  await page.route(`**${signInPath}`, (route) => route.abort('connectionrefused'))

  await fillLogin(page, agent.email, agent.password)

  await expect(page.getByRole('alert')).toHaveText('Could not reach the server. Please try again.')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  await expect(page).toHaveURL('/login')
})

test('a signed-in user opening /login is sent to the home page', async ({ page }) => {
  await signInWithForm(page, agent)

  await page.goto('/login')

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
})
