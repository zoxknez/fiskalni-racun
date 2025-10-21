/**
 * Script za zamenu console.log/error/warn sa logger
 * Usage: node scripts/fix-console-logs.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC_DIR = path.join(__dirname, '..', 'src')

// Patterns za pronalaženje console.* poziva
const CONSOLE_PATTERNS = {
  error: /console\.error\(/g,
  warn: /console\.warn\(/g,
  log: /console\.log\(/g,
  debug: /console\.debug\(/g,
  info: /console\.info\(/g,
}

// Replacement map
const REPLACEMENTS = {
  'console.error(': 'logger.error(',
  'console.warn(': 'logger.warn(',
  'console.log(': 'logger.debug(',
  'console.debug(': 'logger.debug(',
  'console.info(': 'logger.info(',
}

let filesModified = 0
let totalReplacements = 0

/**
 * Check if file already imports logger
 */
function hasLoggerImport(content) {
  return /import\s+.*\blogger\b.*from\s+['"]@\/lib\/logger['"]/.test(content)
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
  // Find first import statement
  const importMatch = content.match(/^import\s/m)

  if (importMatch) {
    const insertIndex = importMatch.index
    const loggerImport = "import { logger } from '@/lib/logger'\n"
    return content.slice(0, insertIndex) + loggerImport + content.slice(insertIndex)
  }

  // No imports found, add at top after any comments
  const lines = content.split('\n')
  let insertLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
      insertLine = i
      break
    }
  }

  lines.splice(insertLine, 0, "import { logger } from '@/lib/logger'")
  return lines.join('\n')
}

/**
 * Process a single file
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  let modified = false
  let replacementCount = 0

  // Check if file has any console statements
  const hasConsole = Object.values(CONSOLE_PATTERNS).some((pattern) => pattern.test(content))

  if (!hasConsole) {
    return
  }

  console.log(`Processing: ${filePath}`)

  // Add logger import if needed
  if (!hasLoggerImport(content)) {
    content = addLoggerImport(content)
    modified = true
  }

  // Replace console.* with logger.*
  for (const [oldStr, newStr] of Object.entries(REPLACEMENTS)) {
    const regex = new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    const matches = content.match(regex)

    if (matches) {
      content = content.replace(regex, newStr)
      replacementCount += matches.length
      modified = true
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8')
    filesModified++
    totalReplacements += replacementCount
    console.log(`  ✅ Replaced ${replacementCount} console statements`)
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
        processDirectory(fullPath)
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      processFile(fullPath)
    }
  }
}

// Run script
console.log('🔍 Scanning for console.* statements...\n')
processDirectory(SRC_DIR)

console.log('\n✨ Done!')
console.log(`📝 Modified ${filesModified} files`)
console.log(`🔄 Replaced ${totalReplacements} console statements`)

if (filesModified === 0) {
  console.log('✅ No console statements found - kod je čist!')
} else {
  console.log('\n⚠️  Run `npm run format` to format modified files')
}
