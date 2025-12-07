import { handleDeleteAccount } from './handlers/delete-account.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Increased for cold start
}

export default handleDeleteAccount
