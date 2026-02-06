import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Download, FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReceiptTab } from '../types'

interface ReceiptExportMenuProps {
  activeTab: ReceiptTab
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onExportFiscalCSV: () => void
  onExportFiscalExcel: () => void
  onExportHouseholdCSV: () => void
  onExportHouseholdExcel: () => void
  onExportAllExcel: () => void
}

export function ReceiptExportMenu({
  activeTab,
  isOpen,
  onToggle,
  onClose,
  onExportFiscalCSV,
  onExportFiscalExcel,
  onExportHouseholdCSV,
  onExportHouseholdExcel,
  onExportAllExcel,
}: ReceiptExportMenuProps) {
  const { t } = useTranslation()

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        type="button"
        className="btn-primary flex items-center gap-2"
      >
        <Download className="h-5 w-5" />
        <span className="hidden sm:inline">{t('receipts.export.button')}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            {activeTab === 'fiscal' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onExportFiscalCSV()
                    onClose()
                  }}
                  className="touch-target flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 active:bg-gray-100 dark:active:bg-gray-700 dark:hover:bg-gray-700"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('receipts.export.csv')}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {t('receipts.export.fiscalReceipts')}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExportFiscalExcel()
                    onClose()
                  }}
                  className="touch-target flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 active:bg-gray-100 dark:active:bg-gray-700 dark:hover:bg-gray-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('receipts.export.excel')}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {t('receipts.export.fiscalWithPreview')}
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onExportHouseholdCSV()
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('receipts.export.csv')}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {t('receipts.export.householdReceipts')}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExportHouseholdExcel()
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('receipts.export.excel')}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {t('receipts.export.householdWithPreview')}
                    </div>
                  </div>
                </button>
              </>
            )}

            <div className="border-gray-200 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  onExportAllExcel()
                  onClose()
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
              >
                <FileSpreadsheet className="h-4 w-4 text-primary-600" />
                <div>
                  <div className="font-medium text-primary-700 dark:text-primary-400">
                    {t('receipts.export.allExcel')}
                  </div>
                  <div className="text-gray-500 text-xs">{t('receipts.export.allDescription')}</div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
