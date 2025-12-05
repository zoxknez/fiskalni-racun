/**
 * HomePage Constants
 *
 * Centralized constants for animations, styling, and configuration
 */

// ────────────────────────────────────────────────────────────
// Data Fetching Limits
// ────────────────────────────────────────────────────────────

/** Number of recent receipts to display on dashboard */
export const RECENT_RECEIPTS_LIMIT = 5

/** Number of days to look ahead for expiring warranties */
export const EXPIRING_DEVICES_DAYS = 30

// ────────────────────────────────────────────────────────────
// Animation Configurations
// ────────────────────────────────────────────────────────────

/** Stagger delay between animated list items (seconds) */
export const STAGGER_DELAY = 0.05

/** Base delay for sequential animations (seconds) */
export const BASE_ANIMATION_DELAY = 0.2

/** Floating orb animation for hero section (primary) */
export const FLOATING_ORB_PRIMARY = {
  animate: {
    scale: [1, 1.1, 1] as number[],
    opacity: [0.3, 0.5, 0.3] as number[],
  },
  transition: {
    duration: 6,
    repeat: Number.POSITIVE_INFINITY,
    ease: 'easeInOut' as const,
  },
}

/** Floating orb animation for hero section (secondary) */
export const FLOATING_ORB_SECONDARY = {
  animate: {
    scale: [1.1, 1, 1.1] as number[],
    opacity: [0.2, 0.3, 0.2] as number[],
  },
  transition: {
    duration: 7,
    repeat: Number.POSITIVE_INFINITY,
    ease: 'easeInOut' as const,
  },
}

/** Pulse animation for badges and alerts */
export const PULSE_ANIMATION = {
  animate: {
    scale: [1, 1.2, 1] as number[],
  },
  transition: {
    duration: 2,
    repeat: Number.POSITIVE_INFINITY,
  },
}

/** Alert badge animation with opacity */
export const ALERT_BADGE_ANIMATION = {
  animate: {
    scale: [1, 1.2, 1] as number[],
    opacity: [1, 0.8, 1] as number[],
  },
  transition: {
    duration: 2,
    repeat: Number.POSITIVE_INFINITY,
    ease: 'easeInOut' as const,
  },
}

/** Wiggle animation for empty state */
export const WIGGLE_ANIMATION = {
  animate: {
    rotate: [0, 5, -5, 0] as number[],
  },
  transition: {
    duration: 2,
    repeat: Number.POSITIVE_INFINITY,
  },
}

/** Warning section animated background */
export const WARNING_BACKGROUND_ANIMATION = {
  animate: {
    backgroundPosition: ['0% 0%', '100% 100%'] as string[],
  },
  transition: {
    duration: 20,
    repeat: Number.POSITIVE_INFINITY,
    repeatType: 'reverse' as const,
  },
}

/** Attention icon animation (rotate + scale) */
export const ATTENTION_ICON_ANIMATION = {
  animate: {
    rotate: [0, 10, -10, 0] as number[],
    scale: [1, 1.1, 1] as number[],
  },
  transition: {
    duration: 2,
    repeat: Number.POSITIVE_INFINITY,
  },
}

// ────────────────────────────────────────────────────────────
// Transition Presets
// ────────────────────────────────────────────────────────────

/** Standard page element entrance transition */
export const ENTRANCE_TRANSITION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
} as const

/** Card hover effect */
export const CARD_HOVER = {
  whileHover: { scale: 1.02, y: -5 },
  whileTap: { scale: 0.98 },
} as const

/** Quick action card hover effect */
export const QUICK_ACTION_HOVER = {
  whileHover: { scale: 1.03, y: -5 },
  whileTap: { scale: 0.97 },
} as const

/** Button hover effect */
export const BUTTON_HOVER = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
} as const

/** List item hover effect */
export const LIST_ITEM_HOVER = {
  whileHover: { scale: 1.02, x: 5 },
  whileTap: { scale: 0.98 },
} as const

// ────────────────────────────────────────────────────────────
// Style Variants (for cva-like usage)
// ────────────────────────────────────────────────────────────

export const STATS_CARD_STYLES = {
  blue: {
    border: 'border-blue-200/50 dark:border-blue-700/50',
    background:
      'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20',
    iconGradient: 'from-blue-500 to-indigo-600',
    decorativeGradient: 'from-blue-400/20',
  },
  amber: {
    border: 'border-amber-200/50 dark:border-amber-700/50',
    background:
      'bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20',
    iconGradient: 'from-amber-500 to-orange-600',
    decorativeGradient: 'from-amber-400/20',
  },
  emerald: {
    border: 'border-emerald-200/50 dark:border-emerald-700/50',
    background:
      'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20',
    iconGradient: 'from-emerald-500 to-teal-600',
    decorativeGradient: 'from-emerald-400/20',
  },
} as const

// ────────────────────────────────────────────────────────────
// Glassmorphism Base Styles
// ────────────────────────────────────────────────────────────

export const GLASS_CARD_BASE =
  'rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl'
export const GLASS_BORDER = 'border border-white/20'
export const GLASS_BACKDROP = 'backdrop-blur-sm'

// ────────────────────────────────────────────────────────────
// Layout Constants
// ────────────────────────────────────────────────────────────

export const HERO_ORB_POSITIONS = {
  primary: '-top-24 -right-24 h-96 w-96',
  secondary: '-bottom-32 -left-32 h-80 w-80',
} as const

export const DECORATIVE_GRADIENT_SIZE = 'h-32 w-32 translate-x-16 translate-y-16'
