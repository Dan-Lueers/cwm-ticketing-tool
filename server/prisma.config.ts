// Prisma 7 doesn't load .env by itself. The package.json scripts run Prisma as
// `bun --env-file=.env --bun prisma ...`; in production DATABASE_URL comes from the environment.
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
