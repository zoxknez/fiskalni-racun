/**
 * ExpiringWarrantiesAlert Component
 *
 * Alert banner for expiring warranties with animated background
 */

import type { Device } from '@lib/db'
import { motion } from 'framer-motion'
import { memo, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, Wrench } from '@/lib/icons'
import {
  ATTENTION_ICON_ANIMATION,
  BASE_ANIMATION_DELAY,
  PULSE_ANIMATION,
  WARNING_BACKGROUND_ANIMATION,
} from '../constants'

interface ExpiringWarrantiesAlertProps {
  expiringDevices: Device[] | undefined
}

function ExpiringWarrantiesAlertComponent({ expiringDevices }: ExpiringWarrantiesAlertProps) {
  const { t } = useTranslation()
  const titleId = useId()

  if (!expiringDevices || expiringDevices.length === 0) {
    return null
  }

  const count = expiringDevices.length

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: BASE_ANIMATION_DELAY + 1.1 }}
      whileHover={{ scale: 1.01 }}
      aria-labelledby={titleId}
      role="alert"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 shadow-2xl">
        {/* Animated background pattern */}
        <motion.div
          {...WARNING_BACKGROUND_ANIMATION}
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)',
            backgroundSize: '60px 60px',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-start gap-4">
          <motion.div
            {...ATTENTION_ICON_ANIMATION}
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
            aria-hidden="true"
          >
            <AlertCircle className="h-8 w-8 text-white" />
          </motion.div>

          <div className="flex-1">
            <h3 id={titleId} className="mb-2 flex items-center gap-2 font-bold text-white text-xl">
              {t('home.expiringWarranties')}
              <motion.span
                {...PULSE_ANIMATION}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white font-black text-red-600 text-sm"
                role="status"
                aria-label={`${count} devices`}
              >
                {count}
              </motion.span>
            </h3>
            <p className="mb-4 text-sm text-white/90">
              {t('home.expiringWarrantiesAlert', { count })}
            </p>

            <Link
              to="/warranties"
              className="inline-flex transform items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-bold text-orange-600 shadow-lg transition-all hover:scale-105 hover:bg-orange-50 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
            >
              <Wrench className="h-5 w-5" aria-hidden="true" />
              {t('home.manageWarranties')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export const ExpiringWarrantiesAlert = memo(ExpiringWarrantiesAlertComponent)
