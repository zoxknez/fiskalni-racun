/**
 * Development Cleanup Script
 *
 * Clears caches, temp files, and resets dev environment
 *
 * @module scripts/dev-cleanup
 */

import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const dirsToClean = [
  'node_modules/.vite',
  'node_modules/.cache',
  'dist',
  'dev-dist',
  '.vite-inspect',
  'coverage',
  '.nyc_output',
]

console.log('🧹 Cleaning development files...\n')

for (const dir of dirsToClean) {
  const fullPath = resolve(process.cwd(), dir)

  if (existsSync(fullPath)) {
    console.log(`   Removing ${dir}...`)
    rmSync(fullPath, { recursive: true, force: true })
  }
}

console.log('\n✅ Cleanup complete!')
console.log('\n💡 Tip: Run "npm install" to reinstall dependencies if needed')
