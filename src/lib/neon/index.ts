/**
 * Neon Database Module Exports
 *
 * Centralized exports for Neon PostgreSQL functionality
 *
 * @module lib/neon
 */

export { type AuthResult, authService, type NeonUser } from './auth'
export { checkDatabaseConnection, initializeDatabase } from './schema'
