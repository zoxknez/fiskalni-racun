import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { ComponentType } from 'react'

interface ReceiptHeaderProps {
  title: string
  icon: ComponentType<{ className?: string | undefined }>
  onBack: () => void
  backLabel: string
  prefersReducedMotion: boolean
}

export function ReceiptHeader({
  title,
  icon: Icon,
  onBack,
  backLabel,
  prefersReducedMotion,
}: ReceiptHeaderProps) {
  return (
    <motion.div
      className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
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
        animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={prefersReducedMotion ? {} : { duration: 4, repeat: Number.POSITIVE_INFINITY }}
        className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
      />

      <div className="relative z-10">
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-2 transition-colors hover:bg-white/10"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Icon className="h-7 w-7" />
          <h1 className="font-black text-3xl sm:text-4xl">{title}</h1>
        </div>
      </div>
    </motion.div>
  )
}
