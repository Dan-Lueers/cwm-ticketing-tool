import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '../db/prisma.ts'

// BETTER_AUTH_SECRET and BETTER_AUTH_URL come from the environment.
// Sessions are stored in the database (no secondaryStorage, no cookieCache): every request is checked against it.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    // No public sign-up: users are created on the server (see src/db/seed.ts, later the admin's user management).
    disableSignUp: true,
  },
  // The Vite dev server (http://localhost:5173) proxies /api to Express; in production it's the same origin.
  trustedOrigins: process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173'],
})

export type Session = typeof auth.$Infer.Session
