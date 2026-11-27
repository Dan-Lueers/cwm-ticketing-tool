import { useState } from 'react'
import { useNavigate } from 'react-router'
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
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="font-semibold text-gray-900 dark:text-gray-100">Ticketing Tool</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </nav>
    </header>
  )
}
