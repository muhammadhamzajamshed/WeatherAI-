import { getWeather } from '../../server/weatherAiClient.js'
import { handleError, json, weatherQuerySchema } from './shared.js'

export async function handler(event) {
  try {
    const query = weatherQuerySchema.parse(event.queryStringParameters || {})
    const data = await getWeather(query)
    return json(200, data)
  } catch (error) {
    return handleError(error)
  }
}
