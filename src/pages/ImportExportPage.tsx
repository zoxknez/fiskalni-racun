/**
 * ImportExportPage
 *
 * Page for importing/exporting data
 * Currently under maintenance
 */

import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'

function ImportExportPage() {
  const { t } = useTranslation()

  return (
    <PageTransition>
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-2xl bg-amber-50 p-8 dark:bg-amber-900/20">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-amber-500" />
          <h1 className="mb-2 font-bold text-2xl text-dark-900 dark:text-white">
            {t('common.underMaintenance', 'Stranica trenutno nije dostupna')}
          </h1>
          <p className="text-dark-600 dark:text-dark-400">
            {t(
              'common.maintenanceMessage',
              'Radimo na poboljšanjima. Molimo pokušajte ponovo kasnije.'
            )}
          </p>
        </div>
      </div>
    </PageTransition>
  )
}

export default ImportExportPage
