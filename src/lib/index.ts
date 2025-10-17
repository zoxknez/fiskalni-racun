// src/lib/index.ts
// This file is intentionally minimal to avoid circular dependencies
// Import directly from @lib/... or @/lib/... as needed

// NOTE: DO NOT re-export from @lib/* here!
// It creates circular dependencies because lib/db.ts imports from @/lib/realtimeSync
// which imports back from @lib/db

// If you need something from root lib/, import it directly: import { db } from '@lib/db'
// If you need something from src/lib/, import it directly: import { logger } from '@/lib/logger'
