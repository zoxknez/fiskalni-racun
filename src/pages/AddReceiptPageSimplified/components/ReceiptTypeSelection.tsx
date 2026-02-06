import { ArrowLeft, Home, Receipt as ReceiptIcon } from '@/lib/icons'
import { ReceiptHeader } from './ReceiptHeader'

interface ReceiptTypeSelectionProps {
  title: string
  fiscalTitle: string
  fiscalDescription: string
  householdTitle: string
  householdDescription: string
  backLabel: string
  prefersReducedMotion: boolean
  onBack: () => void
  onSelectFiscal: () => void
  onSelectHousehold: () => void
}

export function ReceiptTypeSelection({
  title,
  fiscalTitle,
  fiscalDescription,
  householdTitle,
  householdDescription,
  backLabel,
  prefersReducedMotion,
  onBack,
  onSelectFiscal,
  onSelectHousehold,
}: ReceiptTypeSelectionProps) {
  return (
    <>
      <ReceiptHeader
        title={title}
        icon={ReceiptIcon}
        onBack={onBack}
        backLabel={backLabel}
        prefersReducedMotion={prefersReducedMotion}
      />

      <div className="mx-auto max-w-2xl space-y-4 px-6">
        <button
          type="button"
          onClick={onSelectFiscal}
          className="card group w-full p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary-100 p-3 dark:bg-primary-900/30">
              <ReceiptIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-bold text-dark-900 text-lg dark:text-dark-50">
                {fiscalTitle}
              </h3>
              <p className="text-dark-600 text-sm dark:text-dark-400">{fiscalDescription}</p>
            </div>
            <ArrowLeft className="h-5 w-5 rotate-180 text-dark-400 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <button
          type="button"
          onClick={onSelectHousehold}
          className="card group w-full p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
              <Home className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-bold text-dark-900 text-lg dark:text-dark-50">
                {householdTitle}
              </h3>
              <p className="text-dark-600 text-sm dark:text-dark-400">{householdDescription}</p>
            </div>
            <ArrowLeft className="h-5 w-5 rotate-180 text-dark-400 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>
    </>
  )
}
