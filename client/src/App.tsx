import { useEffect, useState } from 'react'
import './App.css'

type WeatherForecast = {
  date: string
  temperatureC: number
  temperatureF: number
  summary: string | null
}

function App() {
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadForecast() {
      try {
        const response = await fetch('/api/weatherforecast')
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        const data: WeatherForecast[] = await response.json()
        if (!cancelled) {
          setForecasts(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load forecast')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadForecast()
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
        <h2>Weather forecast</h2>
        {loading && <p>Loading from the API…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <ul className="forecast-list">
            {forecasts.map((item) => (
              <li key={item.date}>
                <strong>{item.summary ?? 'Unknown'}</strong>
                <span>
                  {item.temperatureC}°C / {item.temperatureF}°F
                </span>
                <time dateTime={item.date}>{item.date}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
