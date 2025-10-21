/**
 * Developer Debugging Tools
 *
 * Utilities for debugging in development mode
 * Only available in DEV mode
 *
 * @module lib/dev/debugTools
 */

import { db } from '@lib/db'
import { logger } from '@/lib/logger'
import { appStore } from '@/store/useAppStore'
import { cacheManager } from '../cache/cacheManager'

/**
 * Global debug object (window.__DEBUG__)
 */
interface DebugTools {
  // Database
  db: typeof db
  clearDB: () => Promise<void>
  exportDB: () => Promise<void>

  // State
  store: typeof appStore
  getState: () => any
  setState: (state: any) => void

  // Cache
  cache: typeof cacheManager
  clearCache: () => void
  cacheStats: () => any

  // Performance
  measureRender: (componentName: string) => void
  logRenders: () => void

  // Storage
  checkQuota: () => Promise<void>

  // Helpers
  log: typeof logger
}

/**
 * Initialize debug tools in development
 */
export function initDebugTools() {
  if (import.meta.env.PROD) return

  const debugTools: DebugTools = {
    // Database tools
    db,

    clearDB: async () => {
      const confirm = window.confirm('⚠️ Clear entire database? This cannot be undone!')
      if (!confirm) return

      await db.receipts.clear()
      await db.devices.clear()
      await db.reminders.clear()
      await db.syncQueue.clear()
      logger.debug('✅ Database cleared')
    },

    exportDB: async () => {
      const data = {
        receipts: await db.receipts.toArray(),
        devices: await db.devices.toArray(),
        settings: await db.settings.toArray(),
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `db-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      logger.debug('✅ Database exported')
    },

    // State tools
    store: appStore,

    getState: () => {
      const state = appStore.getState()
      console.table(state)
      return state
    },

    setState: (partial: any) => {
      appStore.setState(partial)
      logger.debug('✅ State updated:', partial)
    },

    // Cache tools
    cache: cacheManager,

    clearCache: () => {
      cacheManager.clear()
      logger.debug('✅ Cache cleared')
    },

    cacheStats: () => {
      const stats = cacheManager.getStats()
      console.table(stats)
      return stats
    },

    // Performance tools
    measureRender: (componentName: string) => {
      performance.mark(`${componentName}-start`)

      requestAnimationFrame(() => {
        performance.mark(`${componentName}-end`)
        performance.measure(
          `${componentName} render`,
          `${componentName}-start`,
          `${componentName}-end`
        )

        const measure = performance.getEntriesByName(`${componentName} render`)[0]
        if (measure) {
          logger.debug(`⏱️ ${componentName} rendered in ${measure.duration.toFixed(2)}ms`)
        }
      })
    },

    logRenders: () => {
      const measures = performance.getEntriesByType('measure')
      console.table(
        measures.map((m) => ({
          name: m.name,
          duration: `${m.duration.toFixed(2)}ms`,
        }))
      )
    },

    // Storage tools
    checkQuota: async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        const quota = estimate.quota || 0
        const percent = (used / quota) * 100

        logger.debug('💾 Storage Quota:')
        console.table({
          used: `${(used / 1024 / 1024).toFixed(2)} MB`,
          quota: `${(quota / 1024 / 1024).toFixed(2)} MB`,
          percent: `${percent.toFixed(2)}%`,
          available: `${((quota - used) / 1024 / 1024).toFixed(2)} MB`,
        })
      }
    },

    // Logger
    log: logger,
  }

  // Attach to window
  ;(window as any).__DEBUG__ = debugTools

  logger.debug(
    '%c🔧 Debug Tools Available',
    'background: #0ea5e9; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;'
  )
  logger.debug('Access via: window.__DEBUG__')
  logger.debug('Commands:', Object.keys(debugTools).join(', '))
  logger.debug('Example: __DEBUG__.getState()')
}

/**
 * React DevTools profiler wrapper
 */
import { Profiler, type ProfilerOnRenderCallback } from 'react'

export function DevProfiler({ id, children }: { id: string; children: React.ReactNode }) {
  if (import.meta.env.PROD) {
    return <>{children}</>
  }

  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    _baseDuration,
    _startTime,
    _commitTime
  ) => {
    if (actualDuration > 16) {
      // More than one frame
      logger.warn(`⚠️ Slow render: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`)
    }
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  )
}

/**
 * Render count tracker
 */
export function useRenderCount(componentName: string) {
  if (import.meta.env.PROD) return

  const renderCount = React.useRef(0)

  React.useEffect(() => {
    renderCount.current++
    logger.debug(`🔄 ${componentName} rendered ${renderCount.current} times`)
  })
}

import * as React from 'react'
