import { Toaster as SonnerToaster } from 'sonner'
import { useAppStore } from '@/store/useAppStore'

export function EnhancedToaster() {
  const theme = useAppStore((state) => state.settings.theme)

  const resolvedTheme: 'light' | 'dark' | 'system' = theme ?? 'system'
  const prefersDark =
    resolvedTheme === 'dark' ||
    (resolvedTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-center"
      expand={true}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        style: {
          background: prefersDark ? '#1f2937' : '#ffffff',
          color: prefersDark ? '#f9fafb' : '#111827',
          border: `1px solid ${prefersDark ? '#374151' : '#e5e7eb'}`,
        },
        className: 'enhanced-toast',
      }}
    />
  )
}
