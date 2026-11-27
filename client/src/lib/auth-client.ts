import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

// No baseURL: the API is on the same origin (Vite proxies /api in development, Express serves the client in
// production), and Better Auth's default basePath is /api/auth, matching the server.
export const authClient = createAuthClient({
  // Types the server's additional user fields (server/src/auth/auth.ts) so `session.user.role` is known here.
  // Keep the values in sync with the Prisma `Role` enum.
  plugins: [inferAdditionalFields({ user: { role: { type: ['admin', 'agent'] as const, input: false } } })],
})

export type SessionUser = typeof authClient.$Infer.Session.user
