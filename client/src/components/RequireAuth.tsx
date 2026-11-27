import { Navigate, Outlet } from 'react-router'
import { authClient } from '../lib/auth-client.ts'
import { NavBar } from './NavBar.tsx'

/** Layout route for signed-in pages: redirects to /login without a session, otherwise renders the nav bar. */
export function RequireAuth() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <p className="p-8 text-center text-gray-500">Loading…</p>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar user={session.user} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
