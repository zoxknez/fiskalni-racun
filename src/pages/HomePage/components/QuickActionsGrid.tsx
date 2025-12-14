/**
 * QuickActionsGrid Component
 *
 * Grid of quick action cards with 3D hover effects
 */

import { motion } from 'framer-motion'
import { memo, useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useHaptic } from '@/hooks/useHaptic'
import { Home, QrCode, Receipt, Sparkles } from '@/lib/icons'
import { BASE_ANIMATION_DELAY, QUICK_ACTION_HOVER, STAGGER_DELAY } from '../constants'
import type { QuickAction } from '../types'

function QuickActionsGridComponent() {
  const { t } = useTranslation()
  const sectionTitleId = useId()
  const { impactMedium } = useHaptic() // Add haptic hook

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        name: t('home.addFiscalReceipt'),
        description: t('home.addFiscalReceiptDescription'),
        icon: Receipt,
        href: '/add?type=fiscal',
        gradient: 'from-blue-500 via-blue-600 to-indigo-600',
        iconBg: 'from-blue-400 to-indigo-500',
        particles: '🧾',
      },
      {
        name: t('home.addHouseholdBill'),
        description: t('home.addHouseholdBillDescription'),
        icon: Home,
        href: '/add?type=household',
        gradient: 'from-green-500 via-green-600 to-emerald-600',
        iconBg: 'from-green-400 to-emerald-500',
        particles: '🏠',
      },
      {
        name: t('home.scanEReceipt'),
        description: t('home.scanEReceiptDescription'),
        icon: QrCode,
        href: '/scan',
        gradient: 'from-orange-500 via-orange-600 to-amber-600',
        iconBg: 'from-orange-400 to-amber-500',
        particles: '📱',
      },
    ],
    [t]
  )

  return (
    <section aria-labelledby={sectionTitleId}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: BASE_ANIMATION_DELAY + 0.4 }}
      >
        <h2
          id={sectionTitleId}
          className="mb-6 flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-dark-50"
        >
          <Sparkles className="h-6 w-6 text-primary-600" aria-hidden="true" />
          {t('home.quickActions')}
        </h2>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {quickActions.map((action, index) => (
            <motion.li
              key={action.href + action.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: BASE_ANIMATION_DELAY + 0.5 + index * STAGGER_DELAY }}
              {...QUICK_ACTION_HOVER}
            >
              <Link
                to={action.href}
                onClick={impactMedium}
                className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                aria-label={`${action.name}: ${action.description}`}
              >
                <article
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-6 shadow-xl transition-all duration-300 hover:shadow-2xl`}
                >
                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                    aria-hidden="true"
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    <div
                      className={`mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br ${action.iconBg} flex transform items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110`}
                      aria-hidden="true"
                    >
                      <action.icon className="h-8 w-8 text-white" />
                    </div>

                    <h3 className="mb-2 font-bold text-white text-xl">{action.name}</h3>
                    <p className="text-sm text-white/80">{action.description}</p>

                    {/* Particle Effect */}
                    <div
                      className="absolute top-4 right-4 transform text-3xl opacity-20 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100"
                      aria-hidden="true"
                    >
                      {action.particles}
                    </div>
                  </div>

                  {/* Glow Effect */}
                  <div
                    className="-inset-1 absolute bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </article>
              </Link>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  )
}

export const QuickActionsGrid = memo(QuickActionsGridComponent)
