import { handleLogout } from './handlers/logout.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Increased for cold start
}

export default handleLogout
