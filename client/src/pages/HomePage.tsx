import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth-client.ts'

type Health = { status: string; database: string }

export function HomePage() {
  const { data: session } = authClient.useSession()
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(async (res) => {
        // A 503 still carries a JSON body describing what's down.
        if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as Health
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Welcome, {session?.user.name}</h1>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {error ? (
          <p>API: unreachable ({error})</p>
        ) : health ? (
          <>
            <p>API: {health.status}</p>
            <p>Database: {health.database}</p>
          </>
        ) : (
          <p>Checking…</p>
        )}
      </div>
    </div>
  )
}
