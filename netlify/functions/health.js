import { json } from './shared.js'

export async function handler() {
  return json(200, { ok: true })
}
