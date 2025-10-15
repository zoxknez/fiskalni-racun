/**
 * MSW Server Setup
 *
 * For test environment API mocking
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
