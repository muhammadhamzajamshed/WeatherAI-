import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CloudSun,
  Compass,
  Droplets,
  Gauge,
  Loader2,
  LocateFixed,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  Wind,
} from 'lucide-react'
import './App.css'

const presets = [
  { label: 'Nairobi', lat: '-1.2921', lon: '36.8219' },
  { label: 'London', lat: '51.5072', lon: '-0.1276' },
  { label: 'Dubai', lat: '25.2048', lon: '55.2708' },
  { label: 'New York', lat: '40.7128', lon: '-74.0060' },
]

const skeletonMetrics = [
  { label: 'Temperature', icon: ThermometerSun },
  { label: 'Condition', icon: CloudSun },
  { label: 'Wind', icon: Wind },
  { label: 'Wind Direction', icon: Compass },
]

function App() {
  const [coords, setCoords] = useState(presets[0])
  const [days, setDays] = useState(5)
  const [units, setUnits] = useState('metric')
  const [ai, setAi] = useState(true)
  const [weather, setWeather] = useState(null)
  const [usage, setUsage] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const initialLoadRef = useRef(false)

  const unitSymbol = units === 'metric' ? 'C' : 'F'
  const isLoading = status === 'loading'

  const loadDashboard = useCallback(async (nextCoords = coords) => {
    setStatus('loading')
    setError('')

    try {
      const params = new URLSearchParams({
        lat: nextCoords.lat,
        lon: nextCoords.lon,
        label: nextCoords.label,
        days: String(days),
        units,
        ai: String(ai),
      })

      const [weatherResult, usageResult] = await Promise.all([
        fetchJson(`/api/weather?${params.toString()}`),
        fetchJson('/api/usage').catch(() => null),
      ])

      setWeather(weatherResult)
      setUsage(usageResult)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }, [ai, coords, days, units])

  useEffect(() => {
    if (initialLoadRef.current) return
    initialLoadRef.current = true
    loadDashboard()
  }, [loadDashboard])

  const current = weather?.current
  const forecast = weather?.daily ?? []
  const insight = weather?.insight
  const usageView = normalizeUsage(usage)

  const metrics = useMemo(
    () =>
      [
        createMetric('Temperature', formatTemperature(current?.temperature, unitSymbol), ThermometerSun),
        createMetric('Condition', current?.condition, CloudSun),
        createMetric('Wind', formatSpeed(current?.windSpeed, units), Wind),
        createMetric('Wind Direction', formatDirection(current?.windDirection), Compass),
        createMetric('Humidity', formatPercent(current?.humidity), Droplets),
        createMetric('Pressure', formatPressure(current?.pressure), Gauge),
      ].filter(Boolean),
    [current, unitSymbol, units],
  )

  const forecastRows = forecast.slice(0, days)

  function selectPreset(preset) {
    setCoords(preset)
    loadDashboard(preset)
  }

  return (
    <main className="shell">
      <section className="top-strip">
        <div className="brand">
          <CloudSun size={26} />
          <span>WeatherOps</span>
        </div>
        <div className="security-note">
          <ShieldCheck size={16} />
          Server-side WeatherAI proxy
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">WeatherAI integration dashboard</p>
          <h1>Operational weather intelligence, built on live API data.</h1>
          <p>
            Query WeatherAI forecasts, AI summaries, and account usage through a clean React
            interface backed by a Node proxy that keeps credentials server-side.
          </p>
        </div>

        <form
          className="query-panel"
          onSubmit={(event) => {
            event.preventDefault()
            loadDashboard()
          }}
        >
          <div className="panel-heading">
            <Search size={18} />
            <span>Location Query</span>
          </div>

          <div className="preset-grid">
            {presets.map((preset) => (
              <button
                className={coords.label === preset.label ? 'preset active' : 'preset'}
                key={preset.label}
                type="button"
                onClick={() => selectPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="field-grid">
            <label>
              Latitude
              <input
                value={coords.lat}
                inputMode="decimal"
                onChange={(event) => setCoords({ ...coords, lat: event.target.value, label: 'Custom' })}
              />
            </label>
            <label>
              Longitude
              <input
                value={coords.lon}
                inputMode="decimal"
                onChange={(event) => setCoords({ ...coords, lon: event.target.value, label: 'Custom' })}
              />
            </label>
          </div>

          <div className="control-row">
            <label>
              Days
              <input
                min="1"
                max="7"
                type="number"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              />
            </label>
            <label>
              Units
              <select value={units} onChange={(event) => setUnits(event.target.value)}>
                <option value="metric">Metric</option>
                <option value="imperial">Imperial</option>
              </select>
            </label>
          </div>

          <label className="toggle">
            <input checked={ai} type="checkbox" onChange={(event) => setAi(event.target.checked)} />
            <span>Request AI summary</span>
          </label>

          <button className="primary-action" disabled={isLoading} type="submit">
            {isLoading ? <Loader2 className="spin" size={18} /> : <LocateFixed size={18} />}
            Fetch Weather
          </button>
        </form>
      </section>

      {error ? (
        <section className="error-box">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </section>
      ) : null}

      <section className="dashboard">
        <div className="overview-card">
          <div>
            <p className="section-label">Current Conditions</p>
            <h2>{resolvePlace(weather, coords)}</h2>
            <p className="overview-meta">{formatLocationMeta(weather, coords)}</p>
            {current?.observedAt ? <p className="overview-meta">Observed {formatObservedAt(current.observedAt)}</p> : null}
          </div>
          <button className="ghost-button" type="button" onClick={() => loadDashboard()} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'spin' : ''} size={16} />
            Refresh
          </button>
        </div>

        <div className="metrics-grid">
          {isLoading
            ? skeletonMetrics.map((metric) => <MetricCard isLoading key={metric.label} {...metric} />)
            : metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>

        <section className="insight-panel">
          <div className="insight-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="section-label">Decision Brief</p>
            {isLoading ? <SkeletonLine width="min(520px, 100%)" /> : <p>{insight}</p>}
          </div>
        </section>

        <section className="forecast-panel">
          <div className="panel-title">
            <BarChart3 size={18} />
            <span>{days}-day forecast</span>
          </div>
          <div className="forecast-list">
            {isLoading
              ? emptyForecast(days).map((day, index) => (
                  <ForecastRow day={day} index={index} isLoading key={day.date} unitSymbol={unitSymbol} />
                ))
              : forecastRows.map((day, index) => (
                  <ForecastRow day={day} index={index} key={day.date ?? index} unitSymbol={unitSymbol} />
                ))}
            {!isLoading && forecastRows.length === 0 ? (
              <div className="empty-state">Forecast data is unavailable for this query.</div>
            ) : null}
          </div>
        </section>
      </section>

      <section className="usage-panel">
        <div>
          <p className="section-label">Account Usage</p>
          <h2>{isLoading ? 'Loading' : usageView?.planLabel ?? 'Unavailable'}</h2>
          {!isLoading && usageView ? <p className="overview-meta">{usageView.statusText}</p> : null}
        </div>
        {isLoading ? (
          <div className="usage-skeleton">
            <SkeletonLine width="70%" />
            <SkeletonLine width="52%" />
            <SkeletonLine width="64%" />
          </div>
        ) : usageView ? (
          <UsageSummary usage={usageView} />
        ) : (
          <div className="empty-state">Usage data is unavailable.</div>
        )}
      </section>
    </main>
  )
}

function MetricCard({ icon: Icon, isLoading, label, value }) {
  return (
    <article className="metric-card">
      <Icon size={22} />
      <span>{label}</span>
      {isLoading ? <SkeletonLine height="38px" width="64%" /> : <strong>{value}</strong>}
    </article>
  )
}

function ForecastRow({ day, index, isLoading, unitSymbol }) {
  const label = day.date ?? (index === 0 ? 'Today' : `Day ${index + 1}`)
  const primary = formatForecastPrimary(day, unitSymbol)
  const details = formatForecastDetails(day, unitSymbol)

  return (
    <article className="forecast-row">
      <span>{label}</span>
      {isLoading ? (
        <>
          <SkeletonLine height="24px" width="78px" />
          <SkeletonLine height="18px" width="58%" />
        </>
      ) : (
        <>
          {primary ? <strong>{primary}</strong> : null}
          {details ? <small>{details}</small> : null}
        </>
      )}
    </article>
  )
}

function UsageSummary({ usage }) {
  return (
    <div className="usage-summary">
      <div className="usage-meter">
        <div className="usage-meter-fill" style={{ width: `${usage.percentUsed}%` }} />
      </div>
      <div className="usage-stats">
        <UsageStat label="Used" value={usage.usedLabel} />
        <UsageStat label="Remaining" value={usage.remainingLabel} />
        <UsageStat label="Limit" value={usage.limitLabel} />
      </div>
    </div>
  )
}

function UsageStat({ label, value }) {
  return (
    <div className="usage-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SkeletonLine({ height = '18px', width = '100%' }) {
  return <span className="skeleton-line" style={{ height, width }} />
}

async function fetchJson(url) {
  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'WeatherAI request failed')
  }

  return data
}

function createMetric(label, value, icon) {
  if (value === undefined || value === null || value === '') return null
  return { label, value, icon }
}

function resolvePlace(weather, coords) {
  return weather?.location?.name ?? `${Number(coords.lat).toFixed(2)}, ${Number(coords.lon).toFixed(2)}`
}

function formatLocationMeta(weather, coords) {
  const lat = weather?.location?.lat ?? coords.lat
  const lon = weather?.location?.lon ?? coords.lon
  return `Coordinates ${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`
}

function formatTemperature(value, unitSymbol) {
  if (value === undefined || value === null || value === '') return ''
  return `${Math.round(Number(value))} deg ${unitSymbol}`
}

function formatPercent(value) {
  if (value === undefined || value === null || value === '') return ''
  return `${Math.round(Number(value))}%`
}

function formatPressure(value) {
  if (value === undefined || value === null || value === '') return ''
  return `${Math.round(Number(value))} hPa`
}

function formatSpeed(value, units) {
  if (value === undefined || value === null || value === '') return ''
  return `${Math.round(Number(value))} ${units === 'metric' ? 'm/s' : 'mph'}`
}

function formatDirection(value) {
  if (value === undefined || value === null || value === '') return ''
  const degrees = Math.round(Number(value))
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const label = directions[Math.round(degrees / 45) % 8]
  return `${label} ${degrees} deg`
}

function formatObservedAt(value) {
  return String(value).replace('T', ' ')
}

function formatForecastPrimary(day, unitSymbol) {
  if (day.high !== null && day.high !== undefined) return formatTemperature(day.high, unitSymbol)
  return day.condition ?? ''
}

function formatForecastDetails(day, unitSymbol) {
  const details = []

  if (day.low !== null && day.low !== undefined) {
    details.push(`Low ${formatTemperature(day.low, unitSymbol)}`)
  }

  if (day.condition) {
    details.push(day.condition)
  }

  if (day.precipitation !== null && day.precipitation !== undefined) {
    details.push(`${day.precipitation} mm precipitation`)
  }

  return details.join(' | ')
}

function normalizeUsage(usage) {
  if (!usage) return null

  const plan = usage.plan ?? usage.data?.plan ?? 'connected'
  const requests = usage.requests ?? usage.data?.requests ?? usage
  const used = Number(requests.used ?? usage.used ?? 0)
  const limit = Number(requests.limit ?? usage.limit ?? 0)
  const remaining = Number(requests.remaining ?? usage.remaining ?? 0)
  const unlimited = Boolean(requests.unlimited ?? usage.unlimited)
  const percentUsed = unlimited || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100))

  return {
    planLabel: titleCase(plan),
    usedLabel: used.toLocaleString(),
    remainingLabel: unlimited ? 'Unlimited' : remaining.toLocaleString(),
    limitLabel: unlimited ? 'Unlimited' : limit.toLocaleString(),
    percentUsed,
    statusText: unlimited ? 'Unlimited monthly API access' : `${percentUsed}% of monthly quota used`,
  }
}

function titleCase(value) {
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function emptyForecast(length) {
  return Array.from({ length }, (_, index) => ({ date: index === 0 ? 'Today' : `Day ${index + 1}` }))
}

export default App
