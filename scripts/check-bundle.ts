/**
 * Bundle Size Checker
 *
 * Analyzes bundle and reports size information
 *
 * @module scripts/check-bundle
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const DIST_DIR = resolve(process.cwd(), 'dist')
const SIZE_LIMITS = {
  js: 500 * 1024, // 500 KB
  css: 100 * 1024, // 100 KB
  total: 1000 * 1024, // 1 MB
}

interface FileInfo {
  path: string
  size: number
  gzip: number
  brotli: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

function analyzeFiles(dir: string): FileInfo[] {
  const files: FileInfo[] = []

  function walkDir(currentDir: string) {
    const items = readdirSync(currentDir)

    for (const item of items) {
      const fullPath = resolve(currentDir, item)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        walkDir(fullPath)
      } else {
        const ext = extname(item)
        if (['.js', '.css'].includes(ext)) {
          const content = readFileSync(fullPath)
          files.push({
            path: fullPath.replace(DIST_DIR, ''),
            size: stat.size,
            gzip: gzipSync(content).length,
            brotli: brotliCompressSync(content).length,
          })
        }
      }
    }
  }

  walkDir(dir)
  return files
}

console.log('📦 Analyzing bundle sizes...\n')

try {
  const files = analyzeFiles(DIST_DIR)

  // Group by type
  const jsFiles = files.filter((f) => f.path.endsWith('.js'))
  const cssFiles = files.filter((f) => f.path.endsWith('.css'))

  // Calculate totals
  const totalJS = jsFiles.reduce((sum, f) => sum + f.size, 0)
  const totalCSS = cssFiles.reduce((sum, f) => sum + f.size, 0)
  const totalGzip = files.reduce((sum, f) => sum + f.gzip, 0)
  const totalBrotli = files.reduce((sum, f) => sum + f.brotli, 0)

  console.log('JavaScript Files:')
  for (const file of jsFiles.sort((a, b) => b.size - a.size).slice(0, 10)) {
    console.log(`  ${file.path}`)
    console.log(`    Raw:    ${formatBytes(file.size)}`)
    console.log(`    Gzip:   ${formatBytes(file.gzip)}`)
    console.log(`    Brotli: ${formatBytes(file.brotli)}`)
  }

  console.log('\nCSS Files:')
  for (const file of cssFiles) {
    console.log(`  ${file.path}`)
    console.log(`    Raw:    ${formatBytes(file.size)}`)
    console.log(`    Gzip:   ${formatBytes(file.gzip)}`)
    console.log(`    Brotli: ${formatBytes(file.brotli)}`)
  }

  console.log('\n📊 Summary:')
  console.log(
    `  Total JS:     ${formatBytes(totalJS)} ${totalJS > SIZE_LIMITS.js ? '⚠️  OVER LIMIT' : '✅'}`
  )
  console.log(
    `  Total CSS:    ${formatBytes(totalCSS)} ${totalCSS > SIZE_LIMITS.css ? '⚠️  OVER LIMIT' : '✅'}`
  )
  console.log(`  Total Gzip:   ${formatBytes(totalGzip)}`)
  console.log(
    `  Total Brotli: ${formatBytes(totalBrotli)} ${totalGzip + totalCSS > SIZE_LIMITS.total ? '⚠️  OVER LIMIT' : '✅'}`
  )

  console.log('\n💡 Tips:')
  console.log('  - Run "npm run build" with ANALYZE=true to see visualizer')
  console.log('  - Check dist/stats.html for detailed analysis')
  console.log('  - Consider code splitting for large chunks')
} catch (error) {
  console.error('❌ Error analyzing bundle:', error)
  console.log('\n💡 Make sure to run "npm run build" first')
  process.exit(1)
}
