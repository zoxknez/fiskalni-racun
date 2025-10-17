import type { LucideIcon } from 'lucide-react'
import { memo } from 'react'

interface FilterPillProps {
  label: string
  count: number
  icon: LucideIcon
  active: boolean
  onClick: () => void
  variant?: 'primary' | 'success' | 'danger' | 'info'
}

/**
 * Generic reusable filter pill component
 * Supports multiple variants with icons and counters
 *
 * OPTIMIZED: Memoized to prevent re-renders when parent updates
 */
function FilterPill({
  label,
  count,
  icon: Icon,
  active,
  onClick,
  variant = 'primary',
}: FilterPillProps) {
  const variants = {
    primary: {
      active: 'bg-primary-600 text-white shadow-lg shadow-primary-600/40',
      inactive:
        'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-2 border-dark-200 dark:border-dark-700 hover:border-primary-400 dark:hover:border-primary-600',
      badge: 'bg-white/20 text-white',
      inactiveBadge: 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-400',
    },
    success: {
      active: 'bg-green-600 text-white shadow-lg shadow-green-600/40',
      inactive:
        'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-2 border-dark-200 dark:border-dark-700 hover:border-green-400 dark:hover:border-green-600',
      badge: 'bg-white/20 text-white',
      inactiveBadge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    },
    danger: {
      active: 'bg-red-600 text-white shadow-lg shadow-red-600/40',
      inactive:
        'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-2 border-dark-200 dark:border-dark-700 hover:border-red-400 dark:hover:border-red-600',
      badge: 'bg-white/20 text-white',
      inactiveBadge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    },
    info: {
      active: 'bg-blue-600 text-white shadow-lg shadow-blue-600/40',
      inactive:
        'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-2 border-dark-200 dark:border-dark-700 hover:border-blue-400 dark:hover:border-blue-600',
      badge: 'bg-white/20 text-white',
      inactiveBadge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
  }

  const colors = variants[variant]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-all duration-200 ${
        active ? `${colors.active} scale-105` : `${colors.inactive} hover:scale-105`
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 font-bold text-xs ${
          active ? colors.badge : colors.inactiveBadge
        }`}
      >
        {count}
      </span>
    </button>
  )
}

// Export memoized version - prevents re-renders when parent state changes
export default memo(FilterPill)
