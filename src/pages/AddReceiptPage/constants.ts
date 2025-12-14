// AddReceiptPage Constants
// ──────────────────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB
export const MAX_IMAGE_WIDTH = 4096
export const MAX_IMAGE_HEIGHT = 4096
export const AUTH_TOKEN_KEY = 'neon_auth_token'

// Animation variants for Framer Motion
export const HEADER_ANIMATION = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

export const CARD_ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

export const ORB_ANIMATION = (prefersReducedMotion: boolean) => ({
  animate: prefersReducedMotion
    ? {}
    : {
        y: [0, -20, 0],
        rotate: [0, 360],
      },
  transition: prefersReducedMotion
    ? {}
    : {
        duration: 10,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
      },
})
