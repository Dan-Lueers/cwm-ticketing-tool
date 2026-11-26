import { afterEach, expect, test } from 'bun:test'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, type AppDependencies } from './app.ts'

let server: Server | undefined

async function start(deps: Partial<AppDependencies> = {}) {
  const app = createApp({
    checkDatabase: async () => {},
    authHandler: (_req, res) => {
      res.json({ stub: 'auth' })
    },
    ...deps,
  })
  server = app.listen(0)
  await new Promise<void>((resolve) => server!.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  return `http://localhost:${port}`
}

afterEach(() => {
  server?.close()
  server = undefined
})

test('GET /api/health returns ok when the database is reachable', async () => {
  const baseUrl = await start()
  const res = await fetch(`${baseUrl}/api/health`)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ status: 'ok', database: 'ok' })
})

test('GET /api/health returns 503 when the database is unreachable', async () => {
  const baseUrl = await start({
    checkDatabase: async () => {
      throw new Error('connection refused')
    },
  })
  const res = await fetch(`${baseUrl}/api/health`)
  expect(res.status).toBe(503)
  expect(await res.json()).toEqual({ status: 'error', database: 'unreachable' })
})

test('unknown API route returns JSON 404', async () => {
  const baseUrl = await start()
  const res = await fetch(`${baseUrl}/api/does-not-exist`)
  expect(res.status).toBe(404)
  expect(await res.json()).toEqual({ error: 'Not found' })
})

test('requests under /api/auth go to the auth handler', async () => {
  const baseUrl = await start()
  const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, { method: 'POST' })
  expect(await res.json()).toEqual({ stub: 'auth' })
})
