import { handleDeleteAccount } from './handlers/delete-account.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

export default handleDeleteAccount
