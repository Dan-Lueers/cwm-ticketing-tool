import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from './app.ts'

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  baseUrl = `http://localhost:${port}`
})

afterAll(() => {
  server.close()
})

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ status: 'ok' })
})

test('unknown API route returns JSON 404', async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`)
  expect(res.status).toBe(404)
  expect(await res.json()).toEqual({ error: 'Not found' })
})
