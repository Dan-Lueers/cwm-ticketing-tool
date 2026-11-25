import { afterAll, expect, test } from 'bun:test'
import { checkDatabase, prisma } from './prisma.ts'

// Integration test: needs the PostgreSQL database from DATABASE_URL to be running.
afterAll(async () => {
  await prisma.$disconnect()
})

test('connects to the database', async () => {
  await expect(checkDatabase()).resolves.toBeUndefined()
})
