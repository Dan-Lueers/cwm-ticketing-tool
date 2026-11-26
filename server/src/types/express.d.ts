// Adds the signed-in user and session to Express's Request type.
// The types come from Better Auth's config (auth.$Infer.Session), so new user fields show up here automatically.
import type { Session } from '../auth/auth.ts'

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. Undefined on routes that don't use it. */
      user?: Session['user']
      /** Set by `requireAuth`. Undefined on routes that don't use it. */
      session?: Session['session']
    }
  }
}

export {}
