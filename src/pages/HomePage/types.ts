/**
 * HomePage Types & Interfaces
 *
 * Centralized type definitions for the Dashboard page
 */

import type { Device, Receipt } from '@lib/db'
import type { LucideIcon } from 'lucide-react'

// ────────────────────────────────────────────────────────────
// Dashboard Statistics
// ────────────────────────────────────────────────────────────

export interface DashboardStats {
  monthSpending: number
  monthReceiptsCount: number
  expiringDevicesCount: number
  totalDevicesCount: number
  activeWarranties: number
  expiredWarranties: number
  recentReceipts: Receipt[]
  categoryTotals: Record<string, number>
  expiringDevices: Device[]
}

// ────────────────────────────────────────────────────────────
// Quick Actions
// ────────────────────────────────────────────────────────────

export interface QuickAction {
  /** Display name (translated) */
  name: string
  /** Description text (translated) */
  description: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Navigation path */
  href: string
  /** Tailwind gradient classes for background */
  gradient: string
  /** Tailwind gradient classes for icon background */
  iconBg: string
  /** Emoji particle for hover effect */
  particles: string
}

// ────────────────────────────────────────────────────────────
// Stats Card
// ────────────────────────────────────────────────────────────

export type StatsCardVariant = 'blue' | 'amber' | 'emerald'

export interface StatsCardProps {
  /** Navigation link */
  href: string
  /** Card color variant */
  variant: StatsCardVariant
  /** Lucide icon component */
  icon: LucideIcon
  /** Main value to display */
  value: string | number
  /** Label text */
  label: string
  /** Optional subtitle/hint text */
  hint?: string
  /** Optional badge element */
  badge?: React.ReactNode
  /** Show alert indicator */
  showAlert?: boolean
  /** Alert count for badge */
  alertCount?: number
}

// ────────────────────────────────────────────────────────────
// Recent Receipt Item
// ────────────────────────────────────────────────────────────

export interface RecentReceiptItemProps {
  receipt: Receipt
  index: number
  language: string
}

// ────────────────────────────────────────────────────────────
// Hero Section
// ────────────────────────────────────────────────────────────

export interface HeroSectionProps {
  stats: DashboardStats | undefined
  onThemeToggle: () => void
  onLanguageToggle: () => void
  theme: 'light' | 'dark' | 'system'
  language: string
}

// ────────────────────────────────────────────────────────────
// Animation Constants
// ────────────────────────────────────────────────────────────

export interface AnimationConfig {
  duration: number
  repeat: number
  ease: string
}

export interface FloatingOrbAnimation {
  animate: {
    scale: number[]
    opacity: number[]
  }
  transition: AnimationConfig
}
