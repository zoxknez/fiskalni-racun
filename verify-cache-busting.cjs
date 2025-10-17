#!/usr/bin/env node

/**
 * Cache Busting Verification Script
 * Verifikuje da su sve komponente cache busting sistema pravilno implementirane
 */

const fs = require('fs')
const _path = require('path')

const checks = []

function check(name, result, message = '') {
  checks.push({
    name,
    passed: result,
    message,
  })
  const icon = result ? '✅' : '❌'
  console.log(`${icon} ${name}${message ? ` - ${message}` : ''}`)
}

console.log('🔍 Cache Busting Implementation Verification\n')

// 1. Check vite.config.ts
const viteConfig = fs.readFileSync('vite.config.ts', 'utf8')
check(
  'vite.config.ts - [hash] in entryFileNames',
  viteConfig.includes("entryFileNames: 'assets/[name]-[hash].js'"),
  viteConfig.includes("entryFileNames: 'assets/[name]-[hash].js'") ? 'Found' : 'Missing'
)
check(
  'vite.config.ts - [hash] in chunkFileNames',
  viteConfig.includes("chunkFileNames: 'assets/[name]-[hash].js'"),
  viteConfig.includes("chunkFileNames: 'assets/[name]-[hash].js'") ? 'Found' : 'Missing'
)
check(
  'vite.config.ts - [hash] in assetFileNames',
  viteConfig.includes("assetFileNames: 'assets/[name]-[hash][extname]'"),
  viteConfig.includes("assetFileNames: 'assets/[name]-[hash][extname]'") ? 'Found' : 'Missing'
)

// 2. Check public/sw-custom.js
const swCustom = fs.readFileSync('public/sw-custom.js', 'utf8')
check(
  'sw-custom.js - skipWaiting() on install',
  swCustom.includes('self.skipWaiting()'),
  'SW will activate immediately'
)
check(
  'sw-custom.js - Cache cleanup on activate',
  swCustom.includes('caches.delete(name)'),
  'Old caches will be deleted'
)
check(
  'sw-custom.js - FORCE_REFRESH message handler',
  swCustom.includes("event.data.type === 'FORCE_REFRESH'"),
  'App can force cache cleanup'
)

// 3. Check index.html
const indexHtml = fs.readFileSync('index.html', 'utf8')
check(
  'index.html - Runtime cache detection script',
  indexHtml.includes('detectAndClearOldCache'),
  'Cache will be checked on page load'
)
check(
  'index.html - caches.keys() check',
  indexHtml.includes('caches.keys()'),
  'Script checks for old caches'
)

// 4. Check PWAPrompt.tsx
const pwaPrompt = fs.readFileSync('src/components/common/PWAPrompt.tsx', 'utf8')
check(
  'PWAPrompt.tsx - handleUpdate with cache cleanup',
  pwaPrompt.includes('caches.keys()') && pwaPrompt.includes('caches.delete'),
  'Update handler clears caches'
)
check(
  'PWAPrompt.tsx - window.location.reload()',
  pwaPrompt.includes('window.location.reload()'),
  'Hard reload on update'
)

// 5. Check useSWUpdate hook exists
const hookExists = fs.existsSync('src/hooks/useSWUpdate.ts')
check('useSWUpdate.ts hook', hookExists, hookExists ? 'Hook exists' : 'Missing - need to create')

if (hookExists) {
  const useSWUpdate = fs.readFileSync('src/hooks/useSWUpdate.ts', 'utf8')
  check(
    'useSWUpdate.ts - Message listener',
    useSWUpdate.includes('CLEAR_CACHE_AND_RELOAD'),
    'Hook listens for SW messages'
  )
}

// 6. Check App.tsx integration
const appTsx = fs.readFileSync('src/App.tsx', 'utf8')
check('App.tsx - useSWUpdate import', appTsx.includes('import { useSWUpdate }'), 'Hook is imported')
check('App.tsx - useSWUpdate call', appTsx.includes('useSWUpdate()'), 'Hook is called in component')

// 7. Check documentation
const cacheDoc = fs.existsSync('docs/CACHE_BUSTING.md')
const implDoc = fs.existsSync('CACHE_BUSTING_IMPLEMENTATION.md')
const summary = fs.existsSync('CACHE_BUSTING_SUMMARY.txt')

check('docs/CACHE_BUSTING.md', cacheDoc, 'Documentation exists')
check('CACHE_BUSTING_IMPLEMENTATION.md', implDoc, 'Implementation details exist')
check('CACHE_BUSTING_SUMMARY.txt', summary, 'Quick summary exists')

// 8. Check build output
const distExists = fs.existsSync('dist')
if (distExists) {
  const files = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.js'))
  const hasHash = files.some((f) => f.match(/-[a-zA-Z0-9]{8}\./))
  check(
    'dist/ - Files have [hash] pattern',
    hasHash,
    hasHash ? `Found hash pattern in ${files[0]}` : 'No hash found - run: npm run build'
  )
}

// Summary
console.log(`\n${'='.repeat(50)}`)
const passed = checks.filter((c) => c.passed).length
const total = checks.length
console.log(`\nResults: ${passed}/${total} checks passed\n`)

if (passed === total) {
  console.log('✅ All cache busting components are properly implemented!')
  console.log('\n📝 Next steps:')
  console.log('   1. npm run build')
  console.log('   2. npm run preview')
  console.log('   3. Check DevTools > Application > Cache Storage')
  console.log('   4. Deploy to production')
  process.exit(0)
} else {
  console.log('⚠️  Some components are missing!')
  console.log('\nFailed checks:')
  checks
    .filter((c) => !c.passed)
    .forEach((c) => {
      console.log(`   - ${c.name}${c.message ? `: ${c.message}` : ''}`)
    })
  process.exit(1)
}
