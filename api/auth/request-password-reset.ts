import { handleRequestPasswordReset } from './handlers/password-reset.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

export default handleRequestPasswordReset
