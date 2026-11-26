// Integration test against the real database (DATABASE_URL), through the real Express app.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { toNodeHandler } from 'better-auth/node'
import { createApp } from '../app.ts'
import { checkDatabase, prisma } from '../db/prisma.ts'
import { ensureUser } from '../db/seed.ts'
import { Role } from '../generated/prisma/enums.ts'
import { auth, type Session } from './auth.ts'

const email = `auth-test-${crypto.randomUUID()}@example.com`
const password = 'correct horse battery staple'

let server: Server
let baseUrl: string

beforeAll(async () => {
  await ensureUser({ email, password, name: 'Auth Test', role: Role.agent })

  const app = createApp({
    checkDatabase,
    authHandler: toNodeHandler(auth),
    getSession: (headers) => auth.api.getSession({ headers }),
  })
  server = app.listen(0)
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
  const again = await ensureUser({ email, password, name: 'Auth Test', role: Role.agent })
  expect(again).toMatchObject({ created: false, roleChanged: false })
  expect(await prisma.user.count({ where: { email } })).toBe(1)
})

test('seeding an existing user with another role changes the role', async () => {
  const otherEmail = `auth-test-${crypto.randomUUID()}@example.com`
  try {
    await ensureUser({ email: otherEmail, password, name: 'Promote Me', role: Role.agent })
    const promoted = await ensureUser({ email: otherEmail, password, name: 'Promote Me', role: Role.admin })
    expect(promoted).toMatchObject({ created: false, roleChanged: true })
    expect((await prisma.user.findUnique({ where: { email: otherEmail } }))?.role).toBe(Role.admin)
  } finally {
    await prisma.user.deleteMany({ where: { email: otherEmail } })
  }
})

test('sign-in with the right password creates a database session', async () => {
  const res = await signIn({ email, password })
  expect(res.status).toBe(200)
  const cookie = cookieFrom(res)
  expect(cookie).toContain('better-auth.session_token=')

  const result = await getSession(cookie)
  expect(result?.user.email).toBe(email)
  expect(result?.user.role).toBe(Role.agent)
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
    // Asking for the admin role doesn't help either: sign-up is off, and `role` isn't accepted as input.
    body: JSON.stringify({ email: `signup-${crypto.randomUUID()}@example.com`, password, name: 'Nobody', role: Role.admin }),
  })
  expect(res.status).toBe(400)
})

test('GET /api/me returns 401 without a session and the user (with role) with one', async () => {
  const without = await fetch(`${baseUrl}/api/me`)
  expect(without.status).toBe(401)
  expect(await without.json()).toEqual({ error: 'Unauthorized' })

  const cookie = cookieFrom(await signIn({ email, password }))
  const withSession = await fetch(`${baseUrl}/api/me`, { headers: { cookie } })
  expect(withSession.status).toBe(200)
  expect(((await withSession.json()) as { user: unknown }).user).toMatchObject({ email, role: Role.agent })
})
