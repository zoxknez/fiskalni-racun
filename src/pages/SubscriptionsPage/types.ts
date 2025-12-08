/**
 * SubscriptionsPage Types
 *
 * Shared types and constants for the Subscriptions page components
 */

import type { Subscription, SubscriptionBillingCycle, SubscriptionCategory } from '@lib/db'
import type { Locale } from 'date-fns'
import {
  AppWindow,
  Cloud,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  MoreHorizontal,
  Music,
  Newspaper,
  Tv,
} from 'lucide-react'
import type { ElementType } from 'react'
import {
  POPULAR_PROVIDERS,
  SUBSCRIPTION_CATEGORIES,
  type SubscriptionWithStatus,
} from '@/hooks/useSubscriptions'

// Form data structure
export interface SubscriptionFormData {
  name: string
  provider: string
  amount: string
  category: SubscriptionCategory
  billingCycle: SubscriptionBillingCycle
  nextBillingDate: string
  startDate: string
  reminderDays: string
  cancelUrl: string
  loginUrl: string
  notes: string
}

// Initial form state
export const INITIAL_FORM_DATA: SubscriptionFormData = {
  name: '',
  provider: '',
  amount: '',
  category: 'streaming',
  billingCycle: 'monthly',
  nextBillingDate: '',
  startDate: '',
  reminderDays: '3',
  cancelUrl: '',
  loginUrl: '',
  notes: '',
}

// Icon mapping
export const CATEGORY_ICONS: Record<string, ElementType> = {
  streaming: Tv,
  music: Music,
  gaming: Gamepad2,
  fitness: Dumbbell,
  software: AppWindow,
  news: Newspaper,
  cloud: Cloud,
  education: GraduationCap,
  other: MoreHorizontal,
}

// Re-export types and constants for convenience
export type { Subscription, SubscriptionCategory, SubscriptionBillingCycle }
export type { SubscriptionWithStatus }
export { POPULAR_PROVIDERS, SUBSCRIPTION_CATEGORIES }
export type { Locale }
