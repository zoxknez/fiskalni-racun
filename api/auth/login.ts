import { handleLogin } from './handlers/login.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Increased for cold start
}

export default handleLogin
