import type { OCRField } from '@lib/ocr'
import { Camera, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface OCRPreviewProps {
  isProcessing: boolean
  selectedImage: File | null
  imagePreviewUrl: string | null
  ocrFields: OCRField[]
  onRetakePhoto: () => void
  onContinue: () => void
}

export function OCRPreview({
  isProcessing,
  selectedImage,
  imagePreviewUrl,
  ocrFields,
  onRetakePhoto,
  onContinue,
}: OCRPreviewProps) {
  const { t } = useTranslation()

  if (isProcessing) {
    return (
      <div className="empty-state" aria-live="polite">
        <div className="mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="mb-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
          {t('addReceipt.processingOCR')}
        </h3>
        <p className="text-dark-600 text-sm dark:text-dark-400">{t('common.loading')}</p>
      </div>
    )
  }

  if (selectedImage && ocrFields.length > 0) {
    return (
      <div className="space-y-4">
        {/* Success Banner */}
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 text-sm dark:text-green-100">
              {t('common.success')}
            </h3>
            <p className="text-green-700 text-xs dark:text-green-300">
              {t('analytics.statsCount')}: {ocrFields.length}
            </p>
          </div>
        </div>

        {/* Image Preview */}
        {imagePreviewUrl && (
          <div className="relative overflow-hidden rounded-lg border border-dark-200 dark:border-dark-700">
            <img
              src={imagePreviewUrl}
              alt="Receipt preview"
              className="h-auto max-h-64 w-full bg-dark-50 object-contain dark:bg-dark-900"
            />
          </div>
        )}

        {/* OCR Fields */}
        <div className="space-y-2">
          <h4 className="font-medium text-dark-700 text-sm dark:text-dark-300">
            {t('receiptDetail.items')}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ocrFields.map((field) => (
              <div
                key={`${field.label}-${field.value}`}
                className="rounded-lg bg-dark-50 p-2 text-xs dark:bg-dark-800"
              >
                <span className="text-dark-500 capitalize dark:text-dark-400">{field.label}:</span>
                <span className="ml-1 font-medium text-dark-900 dark:text-dark-50">
                  {field.value}
                </span>
                <span className="ml-1 text-dark-400 dark:text-dark-500">
                  ({Math.round(field.confidence * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={onRetakePhoto} className="btn btn-secondary flex-1">
            <Camera className="h-4 w-4" /> {t('addReceipt.photo')}
          </button>
          <button type="button" onClick={onContinue} className="btn btn-primary flex-1">
            {t('common.next')} →
          </button>
        </div>
      </div>
    )
  }

  return null
}
