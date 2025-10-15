/**
 * MSW Browser Setup
 *
 * For development mode API mocking
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
