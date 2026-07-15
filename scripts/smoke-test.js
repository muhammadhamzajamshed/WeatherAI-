const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8080'

const checks = [
  ['/api/health', (data) => data.ok === true],
  ['/api/weather?lat=-1.2921&lon=36.8219&days=2&units=metric&ai=true', (data) => Boolean(data.current && data.daily)],
  ['/api/usage', (data) => data.plan || data.requests || data.remaining !== undefined],
]

for (const [path, isValid] of checks) {
  const response = await fetch(`${baseUrl}${path}`)
  const data = await response.json()

  if (!response.ok || !isValid(data)) {
    throw new Error(`Smoke test failed for ${path}: ${response.status} ${JSON.stringify(data)}`)
  }

  console.log(`ok ${path}`)
}
