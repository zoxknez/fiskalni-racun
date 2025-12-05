/**
 * StatsCardsGrid Component
 *
 * Grid of statistics cards showing spending, warranties, etc.
 */

import type { Device } from '@lib/db'
import { formatCurrency } from '@lib/utils'
import { motion } from 'framer-motion'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Shield, Star, TrendingUp, Wallet } from '@/lib/icons'
import { BASE_ANIMATION_DELAY, PULSE_ANIMATION } from '../constants'
import type { DashboardStats } from '../types'
import { StatsCard } from './StatsCard'

interface StatsCardsGridProps {
  stats: DashboardStats | undefined
  expiringDevices: Device[] | undefined
}

function StatsCardsGridComponent({ stats, expiringDevices }: StatsCardsGridProps) {
  const { t } = useTranslation()

  const monthSpending = stats?.monthSpending || 0
  const expiringCount = expiringDevices?.length || 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: BASE_ANIMATION_DELAY + 0.8 }}
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
      aria-label="Statistics"
    >
      {/* Monthly Spending Card */}
      <StatsCard
        href="/receipts"
        variant="blue"
        icon={Wallet}
        value={formatCurrency(monthSpending)}
        label={t('home.monthSpending')}
        hint={`${stats?.monthReceiptsCount || 0} ${t('home.receiptsShort').toLowerCase()}`}
        badge={
          <motion.div {...PULSE_ANIMATION} aria-hidden="true">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </motion.div>
        }
      />

      {/* Expiring Warranties Card */}
      <StatsCard
        href="/warranties?filter=expiring"
        variant="amber"
        icon={Shield}
        value={expiringCount}
        label={t('home.expiringWarranties')}
        hint={t('home.expiringSoonHint')}
        showAlert={expiringCount > 0}
        alertCount={expiringCount}
      />

      {/* Active Warranties Card */}
      <StatsCard
        href="/warranties"
        variant="emerald"
        icon={Activity}
        value={stats?.activeWarranties || 0}
        label={t('home.activeWarrantiesCard')}
        hint={t('home.totalDevicesLabel', { count: stats?.totalDevicesCount ?? 0 })}
        badge={
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" aria-hidden="true" />
            <span className="font-bold text-dark-600 text-xs dark:text-dark-400">
              {t('home.newBadge')}
            </span>
          </div>
        }
      />
    </motion.section>
  )
}

export const StatsCardsGrid = memo(StatsCardsGridComponent)
