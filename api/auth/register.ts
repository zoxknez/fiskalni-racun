import { handleRegister } from './handlers/register.js'

export const config = {
  runtime: 'edge',
  preferredRegion: 'fra1',
}

export default handleRegister
