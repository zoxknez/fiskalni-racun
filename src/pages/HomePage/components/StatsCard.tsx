/**
 * StatsCard Component
 *
 * Reusable glassmorphism stats card with variants
 */

import { motion } from 'framer-motion'
import { memo } from 'react'
import { Link } from 'react-router-dom'
import {
  ALERT_BADGE_ANIMATION,
  CARD_HOVER,
  DECORATIVE_GRADIENT_SIZE,
  PULSE_ANIMATION,
  STATS_CARD_STYLES,
} from '../constants'
import type { StatsCardProps } from '../types'

function StatsCardComponent({
  href,
  variant,
  icon: Icon,
  value,
  label,
  hint,
  badge,
  showAlert,
  alertCount,
}: StatsCardProps) {
  const styles = STATS_CARD_STYLES[variant]

  return (
    <motion.article {...CARD_HOVER}>
      <Link
        to={href}
        className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <div
          className={`group relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${styles.border} ${styles.background}`}
        >
          <div className="relative z-10">
            <div className="mb-4 flex items-start justify-between">
              <div
                className={`flex h-14 w-14 transform items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${styles.iconGradient}`}
                aria-hidden="true"
              >
                <Icon className="h-7 w-7 text-white" />
              </div>

              {/* Badge or Alert Indicator */}
              {badge}
              {showAlert && alertCount && alertCount > 0 && (
                <motion.div
                  {...ALERT_BADGE_ANIMATION}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 font-bold text-white text-xs"
                  role="status"
                  aria-label={`${alertCount} alerts`}
                >
                  !
                </motion.div>
              )}
            </div>

            <dl>
              <dd className="mb-1 font-black text-3xl text-dark-900 md:text-4xl dark:text-dark-50">
                {value}
              </dd>
              <dt className="font-medium text-dark-600 text-sm dark:text-dark-400">{label}</dt>
              {hint && <dd className="mt-2 text-dark-500 text-xs dark:text-dark-500">{hint}</dd>}
            </dl>
          </div>

          {/* Decorative gradient */}
          <div
            className={`absolute right-0 bottom-0 transform rounded-full bg-gradient-to-tl to-transparent blur-xl transition-all duration-300 group-hover:scale-125 group-hover:blur-2xl ${DECORATIVE_GRADIENT_SIZE} ${styles.decorativeGradient}`}
            aria-hidden="true"
          />
        </div>
      </Link>
    </motion.article>
  )
}

export const StatsCard = memo(StatsCardComponent)

/**
 * TrendingBadge - Shows trending up indicator
 */
export function TrendingBadge() {
  const { TrendingUp } = require('@/lib/icons')
  return (
    <motion.div {...PULSE_ANIMATION} aria-hidden="true">
      <TrendingUp className="h-5 w-5 text-green-500" />
    </motion.div>
  )
}

/**
 * NewBadge - Shows "new" indicator with star
 */
export function NewBadge({ label }: { label: string }) {
  const { Star } = require('@/lib/icons')
  return (
    <div className="flex items-center gap-1">
      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" aria-hidden="true" />
      <span className="font-bold text-dark-600 text-xs dark:text-dark-400">{label}</span>
    </div>
  )
}
