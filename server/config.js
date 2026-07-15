import 'dotenv/config'

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 10000),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 60),
  weatherAiBaseUrl: process.env.WEATHER_AI_BASE_URL || 'https://api.weather-ai.co',
  weatherAiApiKey: process.env.WEATHER_AI_API_KEY || '',
  allowDemoMode:
    process.env.ALLOW_DEMO_MODE === undefined
      ? process.env.NODE_ENV !== 'production'
      : process.env.ALLOW_DEMO_MODE === 'true',
}
