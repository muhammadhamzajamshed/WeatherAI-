import { getUsage } from '../../server/weatherAiClient.js'
import { handleError, json } from './shared.js'

export async function handler() {
  try {
    const data = await getUsage()
    return json(200, data)
  } catch (error) {
    return handleError(error)
  }
}
