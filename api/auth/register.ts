import { handleRegister } from './handlers/register.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Increased for cold start + Neon wake-up time
}

export default handleRegister
