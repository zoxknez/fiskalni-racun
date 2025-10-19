import { Camera } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PhotoUploadPromptProps {
  onTakePhoto: () => void
}

export function PhotoUploadPrompt({ onTakePhoto }: PhotoUploadPromptProps) {
  const { t } = useTranslation()

  return (
    <div className="empty-state">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
        <Camera className="h-10 w-10 text-primary-600 dark:text-primary-400" />
      </div>
      <h3 className="mb-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
        {t('addReceipt.photo')}
      </h3>
      <p className="mb-6 text-dark-600 text-sm dark:text-dark-400">
        {t('addReceipt.processingOCR')}
      </p>
      <button type="button" onClick={onTakePhoto} className="btn-primary flex items-center gap-2">
        <Camera className="h-5 w-5" /> {t('addReceipt.photo')}
      </button>
    </div>
  )
}
