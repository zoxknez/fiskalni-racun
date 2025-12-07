import { handleProfileUpdate } from './handlers/profile.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Increased for cold start
}

export default handleProfileUpdate
