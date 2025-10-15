import { Toaster as SonnerToaster } from 'sonner'
import { useAppStore } from '@/store/useAppStore'

export function EnhancedToaster() {
  const theme = useAppStore((state) => state.settings.theme)

  return (
    <SonnerToaster
      theme={theme === 'system' ? undefined : theme}
      position="top-center"
      expand={true}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        style: {
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827',
          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
        },
        className: 'enhanced-toast',
      }}
    />
  )
}
