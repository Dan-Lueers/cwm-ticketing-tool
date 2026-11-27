import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '../db/prisma.ts'
import { Role } from '../generated/prisma/enums.ts'

/**
 * Returns BETTER_AUTH_SECRET, or throws if it's missing or too short. Without it Better Auth falls back to a public
 * default secret and only refuses that when NODE_ENV is "production", so a deploy that forgets NODE_ENV would sign
 * sessions with a known secret. Checking it here fails every environment, whatever NODE_ENV says.
 */
export function readAuthSecret(value: string | undefined): string {
  if (!value || value.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be set to at least 32 characters (openssl rand -base64 32).')
  }
  return value
}

// BETTER_AUTH_URL comes from the environment.
// Sessions are stored in the database (no secondaryStorage, no cookieCache): every request is checked against it.
export const auth = betterAuth({
  secret: readAuthSecret(process.env.BETTER_AUTH_SECRET),
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    // No public sign-up: users are created on the server (see src/db/seed.ts, later the admin's user management).
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      // input: false: no API request can set or change the role; only server code does (seed, user management).
      // Values come from the Prisma `Role` enum (prisma/schema.prisma), so the two can't drift apart.
      role: { type: Object.values(Role), required: true, defaultValue: Role.agent, input: false },
    },
  },
  // Better Auth only enables its rate limiter when NODE_ENV is "production"; enable it everywhere except tests
  // (`bun test` sets NODE_ENV=test), so a deploy without NODE_ENV still limits password guessing.
  rateLimit: { enabled: process.env.NODE_ENV !== 'test' },
  // The Vite dev server (http://localhost:5173) proxies /api to Express; in production it's the same origin.
  trustedOrigins: process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173'],
})

export type Session = typeof auth.$Infer.Session
