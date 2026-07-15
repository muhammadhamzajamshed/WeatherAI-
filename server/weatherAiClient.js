import { config } from './config.js'

export async function getWeather(params) {
  const data = await requestWeatherAi('/v1/weather', params, demoWeather(params))
  return normalizeWeather(data, params)
}

export async function getUsage() {
  const data = await requestWeatherAi('/v1/usage', undefined, demoUsage())
  return normalizeUsage(data)
}

async function requestWeatherAi(path, params, fallback) {
  if (!config.weatherAiApiKey) {
    if (config.allowDemoMode) return fallback
    const error = new Error('Missing WEATHER_AI_API_KEY')
    error.status = 500
    throw error
  }

  const url = new URL(path, config.weatherAiBaseUrl)

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)

  let response

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.weatherAiApiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
  } catch (error) {
    const upstreamError = new Error(
      error.name === 'AbortError' ? 'WeatherAI request timed out' : 'Unable to reach WeatherAI',
    )
    upstreamError.status = 502
    throw upstreamError
  } finally {
    clearTimeout(timeout)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || data.error || `WeatherAI returned ${response.status}`)
    error.status = response.status
    error.details = data
    throw error
  }

  return data
}

function normalizeWeather(data, params) {
  const current = data.current ?? data.data?.current ?? {}
  const daily = data.daily ?? data.forecast?.daily ?? data.data?.daily ?? data.data?.forecast?.daily ?? []
  const location = data.location ?? data.data?.location ?? null
  const normalizedDaily = daily.map((day, index) => ({
    date: day.date ?? day.time ?? (index === 0 ? 'Today' : `Day ${index + 1}`),
    high: readNumber(day.high, day.max_temp, day.temperature_max, day.temp_max),
    low: readNumber(day.low, day.min_temp, day.temperature_min, day.temp_min),
    precipitation: readNumber(day.precipitation),
    condition: day.condition ?? day.summary ?? codeToCondition(day.weathercode),
    weatherCode: day.weathercode ?? day.weatherCode,
  }))
  const normalizedCurrent = {
    temperature: readNumber(current.temperature, current.temp),
    humidity: readNumber(current.humidity),
    windSpeed: readNumber(current.wind_speed, current.windSpeed, current.windspeed),
    windDirection: readNumber(current.wind_direction, current.windDirection, current.winddirection),
    pressure: readNumber(current.pressure),
    condition: current.condition ?? codeToCondition(current.weathercode),
    weatherCode: current.weathercode ?? current.weatherCode,
    observedAt: current.time ?? current.observed_at ?? current.observedAt,
    isDay: current.is_day ?? current.isDay,
  }
  const aiSummary = data.ai_summary ?? data.aiSummary ?? data.summary ?? data.data?.ai_summary ?? null

  return {
    source: data.source ?? 'weather-ai',
    lat: data.lat ?? location?.lat ?? Number(params.lat),
    lon: data.lon ?? location?.lon ?? Number(params.lon),
    units: data.units ?? params.units,
    days: data.days ?? params.days,
    location: normalizeLocation(location, params),
    current: removeNullValues(normalizedCurrent),
    daily: normalizedDaily.map(removeNullValues),
    hourly: data.hourly ?? data.data?.hourly ?? [],
    insight: aiSummary || buildWeatherInsight(normalizedCurrent, normalizedDaily, params.units),
    insightSource: aiSummary ? 'ai' : 'derived',
  }
}

function normalizeUsage(data) {
  const requests = data.requests ?? data.data?.requests ?? data

  return {
    plan: data.plan ?? data.data?.plan ?? 'connected',
    used: readNumber(requests.used, data.used) ?? 0,
    limit: readNumber(requests.limit, data.limit) ?? 0,
    remaining: readNumber(requests.remaining, data.remaining) ?? 0,
    unlimited: Boolean(requests.unlimited ?? data.unlimited),
  }
}

function normalizeLocation(location, params) {
  if (typeof location === 'string') {
    return {
      name: params.label ?? location,
      lat: Number(params.lat),
      lon: Number(params.lon),
    }
  }

  return {
    name: params.label ?? location?.name ?? `${Number(params.lat).toFixed(2)}, ${Number(params.lon).toFixed(2)}`,
    lat: location?.lat ?? Number(params.lat),
    lon: location?.lon ?? Number(params.lon),
  }
}

function readNumber(...values) {
  const value = values.find((item) => item !== undefined && item !== null && item !== '')
  return value === undefined ? null : Number(value)
}

function removeNullValues(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== ''))
}

function buildWeatherInsight(current, daily, units) {
  const unit = units === 'imperial' ? 'F' : 'C'
  const firstDay = daily[0]
  const parts = []

  if (hasValue(current.temperature)) {
    parts.push(`Current temperature is ${Math.round(current.temperature)} deg ${unit}`)
  }

  if (current.condition) {
    parts.push(`conditions are ${current.condition.toLowerCase()}`)
  }

  if (hasValue(current.windSpeed)) {
    parts.push(`wind is ${Math.round(current.windSpeed)} ${units === 'imperial' ? 'mph' : 'm/s'}`)
  }

  if (hasValue(firstDay?.high) && hasValue(firstDay?.low)) {
    parts.push(`today ranges from ${Math.round(firstDay.low)} to ${Math.round(firstDay.high)} deg ${unit}`)
  }

  if (hasValue(firstDay?.precipitation)) {
    parts.push(`${firstDay.precipitation} mm precipitation is forecast`)
  }

  if (!parts.length) {
    return 'Weather data is available for this location. Review current conditions and forecast before planning outdoor work.'
  }

  return `${sentenceCase(parts.join(', '))}. Use this signal to plan field activity, travel timing, and weather-sensitive operations.`
}

function sentenceCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function codeToCondition(code) {
  const conditions = {
    0: 'Clear sky',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Cloudy',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    80: 'Rain showers',
    95: 'Thunderstorm',
  }

  return conditions[code] ?? null
}

function demoWeather({ lat, lon, days, units }) {
  const metric = units !== 'imperial'
  const baseTemp = metric ? 27 : 81
  const length = Number(days || 5)

  return {
    source: 'demo',
    location: {
      name: 'Demo coordinates',
      lat: Number(lat),
      lon: Number(lon),
    },
    current: {
      temperature: baseTemp,
      humidity: 62,
      wind_speed: metric ? 4 : 9,
      pressure: 1014,
      condition: 'Partly cloudy',
    },
    summary:
      'Warm and stable conditions are expected. Outdoor operations look viable, with light wind and moderate humidity.',
    forecast: {
      daily: Array.from({ length }, (_, index) => ({
        date: index === 0 ? 'Today' : `Day ${index + 1}`,
        high: baseTemp + index,
        low: baseTemp - 7 + index,
        condition: index % 2 ? 'Clear' : 'Partly cloudy',
      })),
    },
  }
}

function demoUsage() {
  return {
    source: 'demo',
    plan: 'demo',
    requests: {
      used: 0,
      limit: 1000,
      remaining: 1000,
    },
    note: 'Set WEATHER_AI_API_KEY to show live WeatherAI usage.',
  }
}
