import { Router } from 'express'
import { z } from 'zod'
import { getUsage, getWeather } from './weatherAiClient.js'

const router = Router()

const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  label: z.string().trim().min(1).max(80).optional(),
  days: z.coerce.number().int().min(1).max(14).default(5),
  units: z.enum(['metric', 'imperial']).default('metric'),
  ai: z
    .preprocess((value) => String(value ?? 'true').toLowerCase(), z.enum(['true', 'false']))
    .transform((value) => value === 'true'),
})

router.get('/health', (_req, res) => {
  res.json({ ok: true })
})

router.get('/weather', async (req, res, next) => {
  try {
    const query = weatherQuerySchema.parse(req.query)
    const data = await getWeather(query)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

router.get('/usage', async (_req, res, next) => {
  try {
    const data = await getUsage()
    res.json(data)
  } catch (error) {
    next(error)
  }
})

export default router
