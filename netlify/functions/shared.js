import { z } from 'zod'

export const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  label: z.string().trim().min(1).max(80).optional(),
  days: z.coerce.number().int().min(1).max(14).default(5),
  units: z.enum(['metric', 'imperial']).default('metric'),
  ai: z
    .preprocess((value) => String(value ?? 'true').toLowerCase(), z.enum(['true', 'false']))
    .transform((value) => value === 'true'),
})

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

export function handleError(error) {
  if (error.name === 'ZodError') {
    return json(400, {
      message: 'Invalid query parameters',
      issues: error.issues,
    })
  }

  return json(error.status || 500, {
    message: error.message || 'Unexpected server error',
    details: process.env.NODE_ENV === 'production' ? undefined : error.details,
  })
}
