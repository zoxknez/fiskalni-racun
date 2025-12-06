import { handleResetPassword } from './handlers/password-reset.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

export default handleResetPassword
