import { Home, Receipt as ReceiptIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ManualFormType } from '../types'

interface ManualTypeSelectorProps {
  type: ManualFormType
  onTypeChange: (type: ManualFormType) => void
}

export function ManualTypeSelector({ type, onTypeChange }: ManualTypeSelectorProps) {
  const { t } = useTranslation()

  const types = [
    {
      key: 'fiscal' as const,
      icon: ReceiptIcon,
      label: t('addReceipt.manualFiscal'),
      ariaLabel: 'Fiscal receipt type',
    },
    {
      key: 'household' as const,
      icon: Home,
      label: t('addReceipt.manualHousehold'),
      ariaLabel: 'Household bill type',
    },
  ]

  return (
    <div
      className="flex gap-2 rounded-lg bg-dark-100 p-1 dark:bg-dark-800"
      role="tablist"
      aria-label={t('addReceipt.manualTypeSwitch')}
    >
      {types.map(({ key, icon: Icon, label, ariaLabel }) => (
        <button
          key={key}
          type="button"
          onClick={() => onTypeChange(key)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 font-medium transition-all ${
            type === key
              ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-700 dark:text-primary-400'
              : 'text-dark-600 hover:text-dark-900 dark:text-dark-400 dark:hover:text-dark-200'
          }`}
          role="tab"
          aria-selected={type === key}
          aria-label={ariaLabel}
        >
          <Icon className="h-5 w-5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
