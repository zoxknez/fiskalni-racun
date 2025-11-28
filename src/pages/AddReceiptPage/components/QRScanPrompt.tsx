import { QrCode } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

interface QRScanPromptProps {
  onStartScanning: () => void
}

export const QRScanPrompt = memo(function QRScanPrompt({ onStartScanning }: QRScanPromptProps) {
  const { t } = useTranslation()

  return (
    <div className="card">
      <div className="empty-state">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <QrCode className="h-10 w-10 text-primary-600 dark:text-primary-400" />
        </div>
        <p className="mb-4 text-dark-600 dark:text-dark-400">{t('addReceipt.scanningQR')}</p>
        <button type="button" onClick={onStartScanning} className="btn-primary">
          {t('addReceipt.startScanning')}
        </button>
      </div>
    </div>
  )
})
