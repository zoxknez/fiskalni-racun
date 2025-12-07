import { handleResetPassword } from './handlers/password-reset.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Increased for cold start
}

export default handleResetPassword
