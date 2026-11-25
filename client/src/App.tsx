import { useEffect, useState } from 'react'

type Health = { status: string; database: string }

function App() {
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
    <main>
      <h1>Ticketing Tool</h1>
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
    </main>
  )
}

export default App
