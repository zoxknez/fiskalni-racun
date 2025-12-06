// Legacy auth.ts - redirects to new modular structure
// This file is kept for backward compatibility
// All handlers have been moved to api/auth/ directory

export { config, default } from './auth/[...path].js'
