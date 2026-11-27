import { Navigate, Outlet } from 'react-router'
import { authClient } from '../lib/auth-client.ts'

/**
 * Layout route for admin-only pages; nest it inside <RequireAuth />. Non-admins are sent to the home page.
 * This only hides the page: admin-only API routes still need their own server-side role check.
 */
export function RequireAdmin() {
  const { data: session } = authClient.useSession()

  if (session?.user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
