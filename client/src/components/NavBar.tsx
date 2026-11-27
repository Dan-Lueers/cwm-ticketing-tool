import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button.tsx'
import { authClient, type SessionUser } from '../lib/auth-client.ts'

export function NavBar({ user }: { user: SessionUser }) {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await authClient.signOut()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="border-b bg-background">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Ticketing Tool</span>
          {/* Only a convenience: /users is guarded by <RequireAdmin />, and admin APIs check the role on the server. */}
          {user.role === 'admin' && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                isActive ? 'text-sm font-medium text-foreground' : 'text-sm text-muted-foreground hover:text-foreground'
              }
            >
              Users
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </nav>
    </header>
  )
}
