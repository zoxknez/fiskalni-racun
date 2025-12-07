import { handleChangePassword } from './handlers/change-password.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Increased for cold start
}

export default handleChangePassword
