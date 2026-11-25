import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.')
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

/** Resolves if the database answers a trivial query, rejects otherwise. */
export async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}
