import { expect, test } from '@playwright/test'
import { admin, agent, appOrigin, signInWithApi, signOutWithApi, signOutWithUi } from './helpers/auth.ts'

test.describe('without a session', () => {
  for (const path of ['/', '/users', '/does-not-exist']) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveURL('/login')
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    })
  }
})

test('an unknown path redirects a signed-in user to the home page', async ({ page }) => {
  await signInWithApi(page.request, agent)

  await page.goto('/does-not-exist')

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
})

test('the session survives a reload and a new page in the same browser context', async ({ page, context }) => {
  await signInWithApi(page.request, agent)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()

  const second = await context.newPage()
  await second.goto('/')
  await expect(second.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
})

test.describe('sign-out', () => {
  test('returns to /login and protected pages redirect afterwards', async ({ page }) => {
    await signInWithApi(page.request, admin)
    await page.goto('/')

    await signOutWithUi(page)

    for (const path of ['/', '/users']) {
      await page.goto(path)
      await expect(page).toHaveURL('/login')
    }
  })

  test('the back button does not show protected content', async ({ page }) => {
    await signInWithApi(page.request, admin)
    await page.goto('/')
    // An in-app navigation, so there's a signed-in history entry to go back to.
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

    await signOutWithUi(page)

    await page.goBack()

    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Welcome/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
  })

  test('the old session cookie stops working immediately', async ({ page, context, playwright }) => {
    await signInWithApi(page.request, agent)
    await page.goto('/')
    // Keep a copy of the cookies as they were while signed in.
    const signedInState = await context.storageState()

    await signOutWithUi(page)

    // Replaying the old cookie: the session is deleted on the server, not just in this browser.
    const replay = await playwright.request.newContext({ baseURL: appOrigin, storageState: signedInState })
    try {
      const response = await replay.get('/api/me')
      expect(response.status()).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    } finally {
      await replay.dispose()
    }
  })
})

test('two browser contexts have independent sessions', async ({ browser }) => {
  const first = await browser.newContext()
  const second = await browser.newContext()
  try {
    await signInWithApi(first.request, agent)
    await signInWithApi(second.request, agent)
    const firstPage = await first.newPage()
    const secondPage = await second.newPage()
    await firstPage.goto('/')
    await secondPage.goto('/')
    await expect(firstPage.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
    await expect(secondPage.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()

    const firstMe = await (await first.request.get('/api/me')).json()
    const secondMe = await (await second.request.get('/api/me')).json()
    expect(firstMe.user.id).toBe(secondMe.user.id)

    await signOutWithUi(firstPage)
    expect((await first.request.get('/api/me')).status()).toBe(401)

    // Signing out in one context ends only that session.
    expect((await second.request.get('/api/me')).status()).toBe(200)
    await secondPage.reload()
    await expect(secondPage.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
  } finally {
    await first.close()
    await second.close()
  }
})

test('signing out of a session that is already gone still ends on /login', async ({ page, context }) => {
  await signInWithApi(page.request, agent)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()

  // End the session behind the page's back (as another tab would), then use the stale page.
  await signOutWithApi(context.request)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
})
