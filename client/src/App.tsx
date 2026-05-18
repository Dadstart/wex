import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadHealth() {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        const data: HealthResponse = await response.json()
        if (!cancelled) {
          setHealth(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to reach the API')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadHealth()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
      <header>
        <p className="eyebrow">Wex</p>
        <h1>ASP.NET Core + React</h1>
        <p className="lede">
          React UI with a C# API. In development, Vite serves the frontend and proxies{' '}
          <code>/api</code> to the backend.
        </p>
      </header>

      <section className="panel" aria-live="polite">
        <h2>API status</h2>
        {loading && <p>Checking the API…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && health && (
          <p>
            Backend is <strong>{health.status}</strong>.
          </p>
        )}
      </section>
    </main>
  )
}

export default App
