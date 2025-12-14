// ReceiptTypeSelector Component
// ──────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Home, Receipt as ReceiptIcon } from '@/lib/icons'
import { HEADER_ANIMATION } from '../constants'

interface ReceiptTypeSelectorProps {
  onSelectType: (type: 'fiscal' | 'household') => void
}

function ReceiptTypeSelectorComponent({ onSelectType }: ReceiptTypeSelectorProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  return (
    <>
      {/* Header */}
      <motion.div
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
        {...HEADER_ANIMATION}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
              backgroundSize: '100px 100px',
            }}
          />
        </div>

        {/* Floating Orbs */}
        <motion.div
          animate={
            prefersReducedMotion
              ? {}
              : {
                  y: [0, -20, 0],
                  rotate: [0, 360],
                }
          }
          transition={
            prefersReducedMotion
              ? {}
              : {
                  duration: 10,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut' as const,
                }
          }
          className="-top-16 -left-16 absolute h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <motion.div
          animate={
            prefersReducedMotion
              ? {}
              : {
                  y: [0, 15, 0],
                  rotate: [0, -360],
                }
          }
          transition={
            prefersReducedMotion
              ? {}
              : {
                  duration: 12,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut' as const,
                }
          }
          className="-bottom-20 -right-20 absolute h-80 w-80 rounded-full bg-purple-400/20 blur-2xl"
        />

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-3">
            <ReceiptIcon className="h-7 w-7" />
            <h1 className="font-black text-3xl sm:text-4xl">{t('addReceipt.title')}</h1>
          </div>
          <p className="max-w-md text-white/80">{t('addReceipt.selectCategory')}</p>
        </div>
      </motion.div>

      {/* Type Selection Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Fiscal Receipt Card */}
        <motion.button
          onClick={() => onSelectType('fiscal')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -5 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 p-6 text-left text-white shadow-primary-500/25 shadow-xl transition-all hover:shadow-2xl"
        >
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 20px 20px, white 2%, transparent 0%)',
                backgroundSize: '40px 40px',
              }}
            />
          </div>
          <motion.div
            className="relative mb-4 inline-flex rounded-2xl bg-white/20 p-4"
            whileHover={prefersReducedMotion ? {} : { rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <ReceiptIcon className="h-8 w-8" />
          </motion.div>
          <h3 className="relative mb-2 font-bold text-xl">{t('addReceipt.fiscalReceipt')}</h3>
          <p className="relative text-sm text-white/80">{t('addReceipt.fiscalDescription')}</p>
          <motion.div
            className="absolute right-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100"
            initial={{ x: -10 }}
            whileHover={{ x: 0 }}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <title>Arrow</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.div>
        </motion.button>

        {/* Household Bill Card */}
        <motion.button
          onClick={() => onSelectType('household')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -5 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 text-left text-white shadow-emerald-500/25 shadow-xl transition-all hover:shadow-2xl"
        >
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 20px 20px, white 2%, transparent 0%)',
                backgroundSize: '40px 40px',
              }}
            />
          </div>
          <motion.div
            className="relative mb-4 inline-flex rounded-2xl bg-white/20 p-4"
            whileHover={prefersReducedMotion ? {} : { rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Home className="h-8 w-8" />
          </motion.div>
          <h3 className="relative mb-2 font-bold text-xl">{t('addReceipt.householdBill')}</h3>
          <p className="relative text-sm text-white/80">{t('addReceipt.householdDescription')}</p>
          <motion.div
            className="absolute right-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100"
            initial={{ x: -10 }}
            whileHover={{ x: 0 }}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <title>Arrow</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.div>
        </motion.button>
      </div>
    </>
  )
}

export const ReceiptTypeSelector = memo(ReceiptTypeSelectorComponent)
