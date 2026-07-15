import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from './config.js'
import apiRoutes from './routes.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../dist')

const allowedOrigins = config.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const isProduction = config.nodeEnv === 'production'

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must be configured in production')
}

app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !isProduction) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error('Origin is not allowed by CORS'))
    },
  }),
)
app.use(express.json())
app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again shortly.' },
  }),
  apiRoutes,
)
app.use(express.static(distPath))

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.use((error, _req, res, _next) => {
  if (error.name === 'ZodError') {
    return res.status(400).json({
      message: 'Invalid query parameters',
      issues: error.issues,
    })
  }

  return res.status(error.status || 500).json({
    message: error.message || 'Unexpected server error',
    details: config.nodeEnv === 'production' ? undefined : error.details,
  })
})

const server = app.listen(config.port, config.host, () => {
  console.log(`WeatherOps running on http://${config.host}:${config.port}`)
})

server.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})
