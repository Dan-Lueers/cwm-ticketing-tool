import { expect, test } from '@playwright/test'
import { admin, agent, sameOrigin, signInWithApi } from './helpers/auth.ts'

test.describe('Users page', () => {
  test('an admin sees the Users link and can open /users', async ({ page }) => {
    await signInWithApi(page.request, admin)
    await page.goto('/')

    await page.getByRole('banner').getByRole('link', { name: 'Users' }).click()

    await expect(page).toHaveURL('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

    // A direct visit works too.
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('an agent sees no Users link and is sent home from /users', async ({ page }) => {
    await signInWithApi(page.request, agent)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)

    await page.goto('/users')

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: `Welcome, ${agent.name}` })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0)
  })
})

test.describe('GET /api/me', () => {
  test('returns 401 without a session', async ({ request }) => {
    const response = await request.get('/api/me')

    expect(response.status()).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  for (const user of [admin, agent]) {
    test(`returns the signed-in ${user.role}`, async ({ page }) => {
      await signInWithApi(page.request, user)

      const response = await page.request.get('/api/me')

      expect(response.status()).toBe(200)
      const { user: me } = await response.json()
      expect(me).toMatchObject({ email: user.email.toLowerCase(), name: user.name, role: user.role })
    })
  }
})

test.describe('sign-up is disabled', () => {
  for (const [label, extra] of [
    ['a plain request', {}],
    ['a request asking for the admin role', { role: 'admin' }],
  ] as const) {
    test(`rejects ${label} and creates no user`, async ({ request }) => {
      const email = `signup-${crypto.randomUUID()}@example.com`
      const password = 'a-long-enough-password'

      const response = await request.post('/api/auth/sign-up/email', {
        headers: sameOrigin,
        data: { email, password, name: 'Intruder', ...extra },
      })

      expect(response.status()).toBe(400)
      expect(await response.text()).toContain('sign up is not enabled')
      expect(response.headers()['set-cookie']).toBeUndefined()
      // Nothing was created: signing in with those details fails.
      const signIn = await request.post('/api/auth/sign-in/email', { headers: sameOrigin, data: { email, password } })
      expect(signIn.status()).toBe(401)
    })
  }
})

test('an agent cannot make themselves an admin', async ({ page }) => {
  await signInWithApi(page.request, agent)

  const response = await page.request.post('/api/auth/update-user', { headers: sameOrigin, data: { role: 'admin' } })

  expect(response.status(), await response.text()).toBe(400)
  const me = await (await page.request.get('/api/me')).json()
  expect(me.user.role).toBe('agent')
  // And the UI still treats them as an agent.
  await page.goto('/users')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
})

test.describe('origin checks', () => {
  const foreign = { Origin: 'http://evil.example' }

  test('sign-in from a foreign origin is rejected', async ({ request }) => {
    const response = await request.post('/api/auth/sign-in/email', {
      headers: foreign,
      data: { email: agent.email, password: agent.password },
    })

    expect(response.status()).toBe(403)
    expect(response.headers()['set-cookie']).toBeUndefined()
  })

  test('sign-out from a foreign origin does not end the session', async ({ page }) => {
    await signInWithApi(page.request, agent)

    const response = await page.request.post('/api/auth/sign-out', { headers: foreign })

    expect(response.status()).toBe(403)
    expect((await page.request.get('/api/me')).status()).toBe(200)
  })
})
