/**
 * HomePage (Dashboard)
 *
 * Main dashboard page with statistics, quick actions, and recent activity.
 * Refactored into smaller, reusable components for better maintainability.
 *
 * @module pages/HomePage
 */

import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import { useDashboardStats, useExpiringDevices, useRecentReceipts } from '@/hooks/useDatabase'
import { useAppStore } from '@/store/useAppStore'
import {
  DashboardError,
  DashboardSkeleton,
  ExpiringWarrantiesAlert,
  HeroSection,
  QuickActionsGrid,
  RecentReceiptsList,
  StatsCardsGrid,
} from './components'
import { EXPIRING_DEVICES_DAYS, RECENT_RECEIPTS_LIMIT } from './constants'

/**
 * Custom hook for dashboard data and error handling
 */
function useDashboardData() {
  const stats = useDashboardStats()
  const recentReceipts = useRecentReceipts(RECENT_RECEIPTS_LIMIT)
  const expiringDevices = useExpiringDevices(EXPIRING_DEVICES_DAYS)

  // Determine loading and error states
  const isLoading =
    stats === undefined || recentReceipts === undefined || expiringDevices === undefined

  // Note: useLiveQuery returns undefined while loading, and the actual value when loaded
  // If there's an error, it would throw - we catch this at the component level
  const hasError = false // useLiveQuery doesn't provide error state directly

  return {
    stats,
    recentReceipts,
    expiringDevices,
    isLoading,
    hasError,
  }
}

/**
 * HomePage Component
 *
 * Displays the main dashboard with:
 * - Hero section with quick stats
 * - Quick action cards
 * - Detailed statistics cards
 * - Recent receipts list
 * - Expiring warranties alert
 */
function HomePageComponent() {
  const { i18n } = useTranslation()

  // Store selectors (optimized - only subscribe to needed values)
  const settings = useAppStore((state) => state.settings)
  const setTheme = useAppStore((state) => state.setTheme)
  const setLanguage = useAppStore((state) => state.setLanguage)

  // Dashboard data
  const { stats, recentReceipts, expiringDevices, isLoading, hasError } = useDashboardData()

  // Handlers (memoized to prevent unnecessary re-renders)
  const handleThemeToggle = useCallback(() => {
    setTheme(settings.theme === 'dark' ? 'light' : 'dark')
  }, [settings.theme, setTheme])

  const handleLanguageToggle = useCallback(async () => {
    const newLang = settings.language === 'sr' ? 'en' : 'sr'
    setLanguage(newLang)
    await i18n.changeLanguage(newLang)
  }, [settings.language, setLanguage, i18n])

  const handleRetry = useCallback(() => {
    // Force a re-render by refreshing the page
    // In a more sophisticated setup, we'd invalidate the query cache
    window.location.reload()
  }, [])

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Error state
  if (hasError) {
    return <DashboardError error={null} onRetry={handleRetry} />
  }

  // Main content
  return (
    <PageTransition className="space-y-8 pb-8">
      {/* Hero Section with Stats */}
      <HeroSection
        stats={stats}
        onThemeToggle={handleThemeToggle}
        onLanguageToggle={handleLanguageToggle}
        theme={settings.theme}
        language={settings.language}
      />

      {/* Quick Actions Grid */}
      <QuickActionsGrid />

      {/* Statistics Cards */}
      <StatsCardsGrid stats={stats} expiringDevices={expiringDevices} />

      {/* Recent Receipts List */}
      <RecentReceiptsList receipts={recentReceipts} language={i18n.language} />

      {/* Expiring Warranties Alert */}
      <ExpiringWarrantiesAlert expiringDevices={expiringDevices} />
    </PageTransition>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(HomePageComponent)
