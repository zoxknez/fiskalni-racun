import { memo, useMemo } from 'react'
import { Toaster as SonnerToaster } from 'sonner'
import { useAppStore } from '@/store/useAppStore'

function EnhancedToasterComponent() {
  const theme = useAppStore((state) => state.settings.theme)

  const resolvedTheme: 'light' | 'dark' | 'system' = theme ?? 'system'

  const prefersDark = useMemo(
    () =>
      resolvedTheme === 'dark' ||
      (resolvedTheme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches),
    [resolvedTheme]
  )

  const toastOptions = useMemo(
    () => ({
      style: {
        background: prefersDark ? '#1f2937' : '#ffffff',
        color: prefersDark ? '#f9fafb' : '#111827',
        border: `1px solid ${prefersDark ? '#374151' : '#e5e7eb'}`,
      },
      className: 'enhanced-toast',
    }),
    [prefersDark]
  )

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-center"
      expand={true}
      richColors
      closeButton
      duration={3000}
      toastOptions={toastOptions}
    />
  )
}

export const EnhancedToaster = memo(EnhancedToasterComponent)
