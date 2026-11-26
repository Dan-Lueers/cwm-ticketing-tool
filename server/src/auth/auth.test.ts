// Integration test against the real database (DATABASE_URL), through the real Express app.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { toNodeHandler } from 'better-auth/node'
import express from 'express'
import { createApp } from '../app.ts'
import { checkDatabase, prisma } from '../db/prisma.ts'
import { createUserIfMissing } from '../db/seed.ts'
import { auth, type Session } from './auth.ts'
import { requireAuth } from './require-auth.ts'

const email = `auth-test-${crypto.randomUUID()}@example.com`
const password = 'correct horse battery staple'

let server: Server
let baseUrl: string

beforeAll(async () => {
  await createUserIfMissing({ email, password, name: 'Auth Test' })

  const app = createApp({ checkDatabase, authHandler: toNodeHandler(auth) })
  // A test-only protected route, on an outer app (inside createApp it would hit the /api 404 handler).
  const outer = express()
  outer.get('/protected', requireAuth((headers) => auth.api.getSession({ headers })), (req, res) => {
    res.json({ email: req.user?.email })
  })
  outer.use(app)

  server = outer.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  server.close()
  await prisma.user.deleteMany({ where: { email } }) // cascades to sessions and accounts
})

function signIn(body: { email: string; password: string }) {
  return fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function getSession(cookie?: string) {
  const res = await fetch(`${baseUrl}/api/auth/get-session`, { headers: cookie ? { cookie } : {} })
  // The JSON response has dates as strings, but these tests only read ids and emails.
  return (await res.json()) as Session | null
}

/** Turns Set-Cookie response headers into a Cookie request header. */
function cookieFrom(res: Response) {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
}

test('seeding the same email twice creates the user once', async () => {
  const again = await createUserIfMissing({ email, password, name: 'Auth Test' })
  expect(again.created).toBe(false)
  expect(await prisma.user.count({ where: { email } })).toBe(1)
})

test('sign-in with the right password creates a database session', async () => {
  const res = await signIn({ email, password })
  expect(res.status).toBe(200)
  const cookie = cookieFrom(res)
  expect(cookie).toContain('better-auth.session_token=')

  const result = await getSession(cookie)
  expect(result?.user.email).toBe(email)
  expect(await prisma.session.count({ where: { userId: result!.user.id } })).toBeGreaterThan(0)
})

test('sign-in with the wrong password is rejected', async () => {
  const res = await signIn({ email, password: 'wrong password' })
  expect(res.status).toBe(401)
  expect(res.headers.getSetCookie()).toEqual([])
})

test('get-session without a cookie returns null', async () => {
  expect(await getSession()).toBeNull()
})

test('sign-out deletes the session', async () => {
  const cookie = cookieFrom(await signIn({ email, password }))
  const { session } = (await getSession(cookie))!

  const res = await fetch(`${baseUrl}/api/auth/sign-out`, { method: 'POST', headers: { cookie } })
  expect(res.status).toBe(200)
  expect(await getSession(cookie)).toBeNull()
  expect(await prisma.session.findUnique({ where: { id: session.id } })).toBeNull()
})

test('public sign-up is disabled', async () => {
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `signup-${crypto.randomUUID()}@example.com`, password, name: 'Nobody' }),
  })
  expect(res.status).toBe(400)
})

test('requireAuth returns 401 without a session and passes the user through with one', async () => {
  const without = await fetch(`${baseUrl}/protected`)
  expect(without.status).toBe(401)
  expect(await without.json()).toEqual({ error: 'Unauthorized' })

  const cookie = cookieFrom(await signIn({ email, password }))
  const withSession = await fetch(`${baseUrl}/protected`, { headers: { cookie } })
  expect(withSession.status).toBe(200)
  expect(await withSession.json()).toEqual({ email })
})
