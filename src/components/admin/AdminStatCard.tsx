import { motion, useSpring } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { memo, useEffect, useState } from 'react'

interface AdminStatCardProps {
  icon: LucideIcon
  label: string
  value: number
  previousValue?: number
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan'
  suffix?: string
  delay?: number
}

const colorConfig = {
  blue: {
    gradient: 'from-blue-500/20 to-blue-600/10',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-500',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/10',
  },
  green: {
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
  },
  purple: {
    gradient: 'from-purple-500/20 to-purple-600/10',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-500',
    border: 'border-purple-500/20',
    glow: 'shadow-purple-500/10',
  },
  amber: {
    gradient: 'from-amber-500/20 to-amber-600/10',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-500',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/10',
  },
  rose: {
    gradient: 'from-rose-500/20 to-rose-600/10',
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-500',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-500/10',
  },
  cyan: {
    gradient: 'from-cyan-500/20 to-cyan-600/10',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-500',
    border: 'border-cyan-500/20',
    glow: 'shadow-cyan-500/10',
  },
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)
  const spring = useSpring(0, { damping: 30, stiffness: 100 })

  useEffect(() => {
    spring.set(value)
    const unsubscribe = spring.on('change', (v) => setDisplayValue(Math.round(v)))
    return () => unsubscribe()
  }, [spring, value])

  return (
    <span className="tabular-nums">
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}

export const AdminStatCard = memo(function AdminStatCard({
  icon: Icon,
  label,
  value,
  previousValue,
  color,
  suffix = '',
  delay = 0,
}: AdminStatCardProps) {
  const config = colorConfig[color]
  const percentChange = previousValue
    ? Math.round(((value - previousValue) / previousValue) * 100)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient}backdrop-blur-xl border ${config.border}p-5 shadow-lg ${config.glow}transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800/50`}
    >
      {/* Background glow effect */}
      <div
        className={`-right-8 -top-8 absolute h-24 w-24 rounded-full ${config.iconBg} opacity-50 blur-2xl`}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div className={`inline-flex rounded-xl ${config.iconBg} mb-4 p-3`}>
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>

        {/* Value */}
        <p className="mb-1 font-bold text-3xl text-gray-900 dark:text-white">
          <AnimatedCounter value={value} suffix={suffix} />
        </p>

        {/* Label and trend */}
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-600 text-sm dark:text-gray-400">{label}</p>
          {percentChange !== null && (
            <span
              className={`rounded-full px-2 py-0.5 font-semibold text-xs ${
                percentChange >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
              }`}
            >
              {percentChange >= 0 ? '+' : ''}
              {percentChange}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
})

export default AdminStatCard
