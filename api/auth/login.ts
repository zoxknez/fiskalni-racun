import { handleLogin } from './handlers/login.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

export default handleLogin
