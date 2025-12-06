/**
 * HeroSection Component
 *
 * Main hero banner with stats, theme/language toggles, and parallax effects
 */

import { motion, useReducedMotion } from 'framer-motion'
import { memo, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useScrollAnimations } from '@/hooks/useOptimizedScroll'
import { Moon, Sparkles, Sun, Zap } from '@/lib/icons'
import { formatDate } from '@/lib/utils/dateUtils'
import {
  BASE_ANIMATION_DELAY,
  BUTTON_HOVER,
  ENTRANCE_TRANSITION,
  FLOATING_ORB_PRIMARY,
  FLOATING_ORB_SECONDARY,
  HERO_ORB_POSITIONS,
} from '../constants'
import type { HeroSectionProps } from '../types'

function HeroSectionComponent({
  stats,
  onThemeToggle,
  onLanguageToggle,
  theme,
  language,
}: HeroSectionProps) {
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const { heroOpacity, heroY } = useScrollAnimations()
  const dashboardTitleId = useId()

  return (
    <motion.section
      style={prefersReducedMotion ? {} : { y: heroY, opacity: heroOpacity }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 text-white shadow-2xl md:p-12"
      aria-labelledby={dashboardTitleId}
      role="banner"
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
            backgroundSize: '100px 100px',
          }}
        />
      </div>

      {/* Floating Orbs - respects reduced motion */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            {...FLOATING_ORB_PRIMARY}
            className={`absolute rounded-full bg-white/20 blur-2xl ${HERO_ORB_POSITIONS.primary}`}
            aria-hidden="true"
          />
          <motion.div
            {...FLOATING_ORB_SECONDARY}
            className={`absolute rounded-full bg-white/10 blur-2xl ${HERO_ORB_POSITIONS.secondary}`}
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative z-10">
        {/* Header with date and toggles */}
        <motion.div
          {...ENTRANCE_TRANSITION}
          transition={{ delay: BASE_ANIMATION_DELAY }}
          className="mb-4 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 animate-pulse" aria-hidden="true" />
            <time
              dateTime={new Date().toISOString()}
              className="font-bold text-sm uppercase tracking-widest opacity-90"
            >
              {formatDate(new Date(), 'EEEE, d MMMM yyyy', i18n.language)}
            </time>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle Button */}
            <motion.button
              {...BUTTON_HOVER}
              onClick={onLanguageToggle}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label={t('neonAuth.toggleLanguage')}
              type="button"
            >
              <span className="font-bold text-lg" aria-hidden="true">
                {language === 'sr' ? '🇬🇧' : '🇷🇸'}
              </span>
              <span className="hidden font-semibold text-sm sm:inline">
                {language === 'sr' ? 'EN' : 'RS'}
              </span>
            </motion.button>

            {/* Theme Toggle Button */}
            <motion.button
              {...BUTTON_HOVER}
              onClick={onThemeToggle}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label={
                theme === 'dark' ? t('neonAuth.switchToLight') : t('neonAuth.switchToDark')
              }
              type="button"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-6 w-6" aria-hidden="true" />
                  <span className="hidden font-semibold text-sm sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-6 w-6" aria-hidden="true" />
                  <span className="hidden font-semibold text-sm sm:inline">Dark</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          id={dashboardTitleId}
          {...ENTRANCE_TRANSITION}
          transition={{ delay: BASE_ANIMATION_DELAY + 0.1 }}
          className="mb-4 font-black text-3xl leading-tight sm:text-4xl md:text-5xl"
        >
          {t('home.title')}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...ENTRANCE_TRANSITION}
          transition={{ delay: BASE_ANIMATION_DELAY + 0.2 }}
          className="max-w-2xl font-medium text-base text-primary-100 sm:text-lg md:text-xl"
        >
          {t('home.subtitle')}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          {...ENTRANCE_TRANSITION}
          transition={{ delay: BASE_ANIMATION_DELAY + 0.3 }}
          className="mt-6 flex flex-wrap gap-3"
        >
          <Link
            to="/add"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-primary-600 shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-50 dark:bg-dark-800 dark:text-primary-300 dark:hover:bg-dark-700"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {t('receipts.addReceipt')}
          </Link>
        </motion.div>

        {/* Quick Stats */}
        <motion.dl
          {...ENTRANCE_TRANSITION}
          transition={{ delay: BASE_ANIMATION_DELAY + 0.3 }}
          className="mt-8 grid grid-cols-3 gap-2 sm:gap-4"
          aria-label="Quick statistics"
        >
          <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
            <dt className="sr-only">{t('home.receiptsThisMonth')}</dt>
            <dd className="truncate font-black text-2xl sm:text-3xl">
              {stats?.monthReceiptsCount || 0}
            </dd>
            <dd className="mt-1 text-[10px] text-primary-100 uppercase leading-tight tracking-wide sm:text-xs">
              <span className="hidden sm:inline">{t('home.receiptsThisMonth')}</span>
              <span className="sm:hidden">{t('home.receiptsShort')}</span>
            </dd>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
            <dt className="sr-only">{t('home.devices')}</dt>
            <dd className="truncate font-black text-2xl sm:text-3xl">
              {stats?.totalDevicesCount || 0}
            </dd>
            <dd className="mt-1 truncate text-[10px] text-primary-100 uppercase tracking-wide sm:text-xs">
              {t('home.devices')}
            </dd>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-2xl sm:p-4">
            <dt className="sr-only">{t('home.activeWarranties')}</dt>
            <dd className="truncate font-black text-2xl sm:text-3xl">
              {stats?.activeWarranties || 0}
            </dd>
            <dd className="mt-1 text-[10px] text-primary-100 uppercase leading-tight tracking-wide sm:text-xs">
              <span className="xs:inline hidden">{t('home.activeWarranties')}</span>
              <span className="xs:hidden">{t('home.activeShort')}</span>
            </dd>
          </div>
        </motion.dl>
      </div>
    </motion.section>
  )
}

export const HeroSection = memo(HeroSectionComponent)
