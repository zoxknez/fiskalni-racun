import { Camera, PenSquare } from 'lucide-react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { FormMode } from '../types'

interface ModeSelectorProps {
  mode: FormMode
  onModeChange: (mode: FormMode) => void
}

export const ModeSelector = memo(function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const { t } = useTranslation()

  const modes = useMemo(
    () => [
      {
        key: 'photo' as const,
        icon: Camera,
        label: t('addReceipt.photo'),
        ariaLabel: 'Take photo mode',
      },
      {
        key: 'manual' as const,
        icon: PenSquare,
        label: t('addReceipt.manual'),
        ariaLabel: 'Manual entry mode',
      },
    ],
    [t]
  )

  return (
    <div
      className="flex gap-2 rounded-lg bg-dark-100 p-1 dark:bg-dark-800"
      role="tablist"
      aria-label="Add receipt modes"
    >
      {modes.map(({ key, icon: Icon, label, ariaLabel }) => (
        <button
          key={key}
          type="button"
          onClick={() => onModeChange(key)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
            mode === key
              ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-700 dark:text-primary-400'
              : 'text-dark-600 hover:text-dark-900 dark:text-dark-400 dark:hover:text-dark-200'
          }`}
          aria-label={ariaLabel}
          role="tab"
          aria-selected={mode === key}
        >
          <Icon className="h-5 w-5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
})
