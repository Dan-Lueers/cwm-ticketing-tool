import type { RequestHandler } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import type { Session } from './auth.ts'

/** Looks up the session for the request's headers (cookie). Resolves to null if there is none. */
export type GetSession = (headers: Headers) => Promise<Session | null>

/**
 * Rejects requests without a valid session with 401. On success the user and session are on
 * `req.user` / `req.session` (typed in src/types/express.d.ts).
 */
export function requireAuth(getSession: GetSession): RequestHandler {
  return async (req, res, next) => {
    const result = await getSession(fromNodeHeaders(req.headers))
    if (!result) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    req.user = result.user
    req.session = result.session
    next()
  }
}
