/**
 * useSubscriptions Hook
 *
 * Hook for managing subscriptions (Netflix, Spotify, etc.)
 */

import {
  addSubscription,
  deleteSubscription,
  getAllSubscriptions,
  markSubscriptionPaid,
  type Subscription,
  type SubscriptionBillingCycle,
  type SubscriptionCategory,
  toggleSubscriptionActive,
  updateSubscription,
} from '@lib/db'
import { differenceInDays, isBefore, isToday } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'

// Subscription category options with icons/colors
export const SUBSCRIPTION_CATEGORIES = [
  { key: 'streaming' as const, color: '#E50914', icon: 'Tv' }, // Netflix red
  { key: 'music' as const, color: '#1DB954', icon: 'Music' }, // Spotify green
  { key: 'gaming' as const, color: '#9147FF', icon: 'Gamepad2' }, // Twitch purple
  { key: 'fitness' as const, color: '#FF6B00', icon: 'Dumbbell' }, // Orange
  { key: 'software' as const, color: '#0078D4', icon: 'AppWindow' }, // Microsoft blue
  { key: 'news' as const, color: '#1DA1F2', icon: 'Newspaper' }, // Twitter blue
  { key: 'cloud' as const, color: '#4285F4', icon: 'Cloud' }, // Google blue
  { key: 'education' as const, color: '#00A67E', icon: 'GraduationCap' }, // Green
  { key: 'other' as const, color: '#6B7280', icon: 'MoreHorizontal' },
] as const

// Popular subscription providers with their logos and colors
export const POPULAR_PROVIDERS = [
  { name: 'Netflix', category: 'streaming' as const, color: '#E50914', logoEmoji: '🎬' },
  { name: 'Spotify', category: 'music' as const, color: '#1DB954', logoEmoji: '🎵' },
  { name: 'YouTube Premium', category: 'streaming' as const, color: '#FF0000', logoEmoji: '▶️' },
  { name: 'Disney+', category: 'streaming' as const, color: '#113CCF', logoEmoji: '🏰' },
  { name: 'HBO Max', category: 'streaming' as const, color: '#5822B4', logoEmoji: '📺' },
  { name: 'Amazon Prime', category: 'streaming' as const, color: '#00A8E1', logoEmoji: '📦' },
  { name: 'Apple Music', category: 'music' as const, color: '#FA2D48', logoEmoji: '🍎' },
  { name: 'Apple TV+', category: 'streaming' as const, color: '#000000', logoEmoji: '🍎' },
  { name: 'Xbox Game Pass', category: 'gaming' as const, color: '#107C10', logoEmoji: '🎮' },
  { name: 'PlayStation Plus', category: 'gaming' as const, color: '#003791', logoEmoji: '🎮' },
  { name: 'Microsoft 365', category: 'software' as const, color: '#0078D4', logoEmoji: '💼' },
  {
    name: 'Adobe Creative Cloud',
    category: 'software' as const,
    color: '#FF0000',
    logoEmoji: '🎨',
  },
  { name: 'Dropbox', category: 'cloud' as const, color: '#0061FF', logoEmoji: '📁' },
  { name: 'Google One', category: 'cloud' as const, color: '#4285F4', logoEmoji: '☁️' },
  { name: 'iCloud+', category: 'cloud' as const, color: '#3693F3', logoEmoji: '☁️' },
  { name: 'Teretana', category: 'fitness' as const, color: '#FF6B00', logoEmoji: '💪' },
  { name: 'Duolingo Plus', category: 'education' as const, color: '#58CC02', logoEmoji: '🦉' },
  { name: 'LinkedIn Premium', category: 'software' as const, color: '#0A66C2', logoEmoji: '💼' },
  { name: 'ChatGPT Plus', category: 'software' as const, color: '#10A37F', logoEmoji: '🤖' },
  { name: 'Twitch', category: 'streaming' as const, color: '#9147FF', logoEmoji: '🎮' },
] as const

export const BILLING_CYCLES: SubscriptionBillingCycle[] = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]

export interface SubscriptionWithStatus extends Subscription {
  daysUntilBilling: number
  isOverdue: boolean
  isDueSoon: boolean // within reminder days
  isDueToday: boolean
  statusColor: string
  monthlyEquivalent: number // monthly cost for comparison
}

export interface UseSubscriptionsResult {
  subscriptions: Subscription[]
  subscriptionsWithStatus: SubscriptionWithStatus[]
  activeSubscriptions: SubscriptionWithStatus[]
  upcomingBilling: SubscriptionWithStatus[]
  isLoading: boolean
  createSubscription: (
    subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>
  updateSubscription: (
    id: string,
    updates: Partial<Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>
  deleteSubscription: (id: string) => Promise<void>
  markAsPaid: (id: string) => Promise<void>
  toggleActive: (id: string, isActive: boolean) => Promise<void>
  getMonthlyTotal: () => number
  getYearlyTotal: () => number
  getCategoryInfo: (
    category: SubscriptionCategory
  ) => (typeof SUBSCRIPTION_CATEGORIES)[number] | undefined
  getProviderInfo: (name: string) => (typeof POPULAR_PROVIDERS)[number] | undefined
}

function getStatusColor(sub: SubscriptionWithStatus): string {
  if (!sub.isActive) return '#9CA3AF' // gray for inactive
  if (sub.isOverdue) return '#EF4444' // red
  if (sub.isDueToday) return '#F59E0B' // amber
  if (sub.isDueSoon) return '#3B82F6' // blue
  return '#10B981' // green
}

function calculateMonthlyEquivalent(
  amount: number,
  billingCycle: SubscriptionBillingCycle
): number {
  switch (billingCycle) {
    case 'weekly':
      return amount * 4.33 // average weeks per month
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'yearly':
      return amount / 12
    default:
      return amount
  }
}

export function useSubscriptions(): UseSubscriptionsResult {
  const subscriptions = useLiveQuery(() => getAllSubscriptions(), [], [])
  const isLoading = subscriptions === undefined

  // Add status information to each subscription
  const subscriptionsWithStatus = useMemo((): SubscriptionWithStatus[] => {
    if (!subscriptions) return []

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return subscriptions.map((sub) => {
      const billingDate = new Date(sub.nextBillingDate)
      billingDate.setHours(0, 0, 0, 0)

      const daysUntilBilling = differenceInDays(billingDate, now)
      const isOverdue = isBefore(billingDate, now) && !isToday(billingDate)
      const isDueToday = isToday(billingDate)
      const isDueSoon = !isOverdue && !isDueToday && daysUntilBilling <= sub.reminderDays

      const statusSub: SubscriptionWithStatus = {
        ...sub,
        daysUntilBilling,
        isOverdue,
        isDueSoon,
        isDueToday,
        statusColor: '#10B981',
        monthlyEquivalent: calculateMonthlyEquivalent(sub.amount, sub.billingCycle),
      }
      statusSub.statusColor = getStatusColor(statusSub)

      return statusSub
    })
  }, [subscriptions])

  // Filter active subscriptions
  const activeSubscriptions = useMemo(() => {
    return subscriptionsWithStatus.filter((s) => s.isActive)
  }, [subscriptionsWithStatus])

  // Filter upcoming billing (due within 7 days)
  const upcomingBilling = useMemo(() => {
    return subscriptionsWithStatus
      .filter((s) => s.isActive && (s.isDueSoon || s.isDueToday || s.isOverdue))
      .sort((a, b) => a.daysUntilBilling - b.daysUntilBilling)
  }, [subscriptionsWithStatus])

  const createSubscription = useCallback(
    async (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
      return addSubscription(subscription)
    },
    []
  )

  const updateSub = useCallback(
    async (id: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>>) => {
      await updateSubscription(id, updates)
    },
    []
  )

  const deleteSub = useCallback(async (id: string) => {
    await deleteSubscription(id)
  }, [])

  const markAsPaid = useCallback(async (id: string) => {
    await markSubscriptionPaid(id)
  }, [])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await toggleSubscriptionActive(id, isActive)
  }, [])

  const getMonthlyTotal = useCallback(() => {
    return activeSubscriptions.reduce((sum, sub) => sum + sub.monthlyEquivalent, 0)
  }, [activeSubscriptions])

  const getYearlyTotal = useCallback(() => {
    return getMonthlyTotal() * 12
  }, [getMonthlyTotal])

  const getCategoryInfo = useCallback((category: SubscriptionCategory) => {
    return SUBSCRIPTION_CATEGORIES.find((c) => c.key === category)
  }, [])

  const getProviderInfo = useCallback((name: string) => {
    return POPULAR_PROVIDERS.find((p) => p.name.toLowerCase() === name.toLowerCase())
  }, [])

  return {
    subscriptions: subscriptions ?? [],
    subscriptionsWithStatus,
    activeSubscriptions,
    upcomingBilling,
    isLoading,
    createSubscription,
    updateSubscription: updateSub,
    deleteSubscription: deleteSub,
    markAsPaid,
    toggleActive,
    getMonthlyTotal,
    getYearlyTotal,
    getCategoryInfo,
    getProviderInfo,
  }
}
