/**
 * PWA Installation Hook
 *
 * Manages PWA install prompt and installation state
 *
 * @module hooks/usePWAInstall
 */

import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Hook to handle PWA installation
 *
 * @example
 * ```tsx
 * function InstallButton() {
 *   const { canInstall, install, isInstalled } = usePWAInstall()
 *
 *   if (isInstalled || !canInstall) return null
 *
 *   return <button onClick={install}>Install App</button>
 * }
 * ```
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      const isInstalled = isStandalone || isInWebAppiOS

      setIsInstalled(isInstalled)

      if (isInstalled) {
        logger.info('PWA is already installed')
      }
    }

    checkInstalled()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent

      setDeferredPrompt(event)
      setCanInstall(true)

      logger.info('PWA install prompt available')
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)

      logger.info('PWA installed successfully')

      // Track installation
      if (window.posthog) {
        window.posthog.capture('app_installed')
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      logger.warn('No install prompt available')
      return false
    }

    try {
      // Show install prompt
      await deferredPrompt.prompt()

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice

      logger.info('Install prompt outcome:', outcome)

      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setCanInstall(false)
        return true
      }

      return false
    } catch (error) {
      logger.error('Install prompt failed:', error)
      return false
    }
  }, [deferredPrompt])

  return {
    canInstall,
    isInstalled,
    install,
  }
}
