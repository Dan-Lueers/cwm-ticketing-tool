import { createAuthClient } from 'better-auth/react'

// No baseURL: the API is on the same origin (Vite proxies /api in development, Express serves the client in
// production), and Better Auth's default basePath is /api/auth, matching the server.
export const authClient = createAuthClient()

export type SessionUser = typeof authClient.$Infer.Session.user
