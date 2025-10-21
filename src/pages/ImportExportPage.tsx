// src/pages/ImportExportPage.tsx

import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Database, Download, FileText, Upload } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { logger } from '@/lib/logger'
import {
  downloadUserDataArchive,
  downloadUserDataCsv,
  downloadUserDataJson,
  importUserDataFromFile,
} from '@/services/accountService'
import type { ImportStats } from '@/services/importService'
import { importFromMojRacun, validateSQLiteFile } from '@/services/importService'
import { useAppStore } from '@/store/useAppStore'

type TabType = 'import' | 'export'
type ExportFormat = 'json' | 'csv' | 'all'

export default function ImportExportPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAppStore()

  const fileInputId = useId()
  const dataFileInputRef = useRef<HTMLInputElement | null>(null)

  const [activeTab, setActiveTab] = useState<TabType>('import')
  const [isDragging, setIsDragging] = useState(false)

  // Import states
  const [isImporting, setIsImporting] = useState(false)
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Export states
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [isImportingData, setIsImportingData] = useState(false)

  // ═══════════════════════════════════════════════════════════
  // IMPORT FROM MOJ RACUN (.db file)
  // ═══════════════════════════════════════════════════════════

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      setImportError(null)
      setImportStats(null)

      // Validacija ekstenzije
      if (!file.name.endsWith('.db')) {
        setImportError(t('importPage.errorExtension'))
        return
      }

      // Validacija veličine (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setImportError(t('importPage.errorSize'))
        return
      }

      setIsImporting(true)

      try {
        // Validacija SQLite formata
        const isValid = await validateSQLiteFile(file)
        if (!isValid) {
          throw new Error(t('importPage.errorInvalid'))
        }

        // Import
        const stats = await importFromMojRacun(file)
        setImportStats(stats)

        // Redirect nakon 3 sekunde
        setTimeout(() => {
          navigate('/receipts')
        }, 3000)
      } catch (err) {
        logger.error('Import greška:', err)
        setImportError(err instanceof Error ? err.message : t('importPage.errorTitle'))
      } finally {
        setIsImporting(false)
      }
    },
    [navigate, t]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0 && files[0]) {
        await processFile(files[0])
      }
    },
    [processFile]
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0 && files[0]) {
        await processFile(files[0])
      }
    },
    [processFile]
  )

  // ═══════════════════════════════════════════════════════════
  // EXPORT DATA (JSON, CSV, ZIP)
  // ═══════════════════════════════════════════════════════════

  const handleExportData = async () => {
    if (!user) return

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const baseFilename = `fiskalni-racun-${timestamp}`

      if (exportFormat === 'json') {
        await downloadUserDataJson(user.id, { filename: baseFilename })
      } else if (exportFormat === 'csv') {
        await downloadUserDataCsv(user.id, { filename: `${baseFilename}-csv` })
      } else {
        await downloadUserDataArchive(user.id, {
          filename: `${baseFilename}-bundle`,
          includeJson: true,
          includeCsv: true,
        })
      }

      toast.success(t('common.success'))
    } catch (error) {
      logger.error('Data export failed', error)
      toast.error(t('common.error'))
    } finally {
      setIsExporting(false)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // IMPORT USER DATA (JSON/ZIP backup)
  // ═══════════════════════════════════════════════════════════

  const handleImportClick = () => {
    dataFileInputRef.current?.click()
  }

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !user) return

    const file = files[0]
    if (!file) return

    const confirmed = window.confirm(String(t('profile.importConfirm')))
    if (!confirmed) return

    setIsImportingData(true)
    try {
      const result = await importUserDataFromFile(user.id, file)
      toast.success(
        t('profile.importSuccess', {
          receipts: result.receipts,
          devices: result.devices,
        })
      )
      navigate('/receipts')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'import_failed'
      if (message === 'unsupported_format') {
        toast.error(t('profile.importUnsupported'))
      } else {
        logger.error('Data import failed', error)
        toast.error(t('profile.importError'))
      }
    } finally {
      setIsImportingData(false)
    }
  }

  return (
    <PageTransition>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
                backgroundSize: '100px 100px',
              }}
            />
          </div>

          {/* Floating Orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-3xl"
          />

          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-3">
              <Database className="h-8 w-8" />
              <h1 className="font-black text-3xl sm:text-4xl">
                {t('importExportPage.title', { defaultValue: 'Import / Export' })}
              </h1>
            </div>
            <p className="text-lg text-purple-100">
              {t('importExportPage.subtitle', {
                defaultValue: 'Uvezite podatke iz Moj Račun aplikacije ili izvezite vaše podatke',
              })}
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex gap-2 rounded-xl border border-dark-200 bg-white/50 p-1 backdrop-blur-sm dark:border-dark-700 dark:bg-dark-800/50"
        >
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-dark-600 hover:bg-dark-100 dark:text-dark-400 dark:hover:bg-dark-700'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span className="hidden sm:inline">
              {t('importExportPage.importTab', { defaultValue: 'Import iz Moj Račun' })}
            </span>
            <span className="sm:hidden">Import</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
              activeTab === 'export'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-dark-600 hover:bg-dark-100 dark:text-dark-400 dark:hover:bg-dark-700'
            }`}
          >
            <Download className="h-5 w-5" />
            <span className="hidden sm:inline">
              {t('importExportPage.exportTab', { defaultValue: 'Export podataka' })}
            </span>
            <span className="sm:hidden">Export</span>
          </button>
        </motion.div>

        {/* IMPORT TAB */}
        {activeTab === 'import' && (
          <>
            {/* Uputstvo */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20"
            >
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-blue-900 text-lg dark:text-blue-100">
                <FileText className="h-5 w-5" />
                {t('importPage.instructionsTitle')}
              </h2>
              <ol className="list-inside list-decimal space-y-2 text-gray-700 text-sm dark:text-gray-300">
                <li>{t('importPage.step1')}</li>
                <li>{t('importPage.step2')}</li>
                <li>{t('importPage.step3')}</li>
                <li>{t('importPage.step4')}</li>
                <li>{t('importPage.step5')}</li>
                <li>{t('importPage.step6')}</li>
              </ol>
            </motion.div>

            {/* Upload zona */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              role="button"
              tabIndex={0}
              className={`rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50 shadow-lg dark:bg-indigo-900/20'
                  : 'border-gray-300 hover:border-indigo-400 hover:shadow-md dark:border-gray-700'
              } ${isImporting ? 'pointer-events-none opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  document.getElementById(fileInputId)?.click()
                }
              }}
            >
              <motion.div
                animate={isDragging ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Database className="mx-auto mb-4 h-20 w-20 text-indigo-400" />
              </motion.div>

              <h3 className="mb-2 font-semibold text-gray-900 text-xl dark:text-gray-100">
                {isImporting ? t('importPage.importing') : t('importPage.dragDropTitle')}
              </h3>

              <p className="mb-6 text-gray-600 dark:text-gray-400">
                {t('importPage.dragDropSubtitle')}
              </p>

              <label className="inline-block">
                <input
                  id={fileInputId}
                  type="file"
                  accept=".db"
                  onChange={handleFileInput}
                  disabled={isImporting}
                  className="hidden"
                />
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl"
                >
                  <Upload className="h-5 w-5" />
                  {t('importPage.selectFileButton')}
                </motion.span>
              </label>

              <p className="mt-6 text-gray-500 text-sm dark:text-gray-500">
                {t('importPage.supportedFormat')}
              </p>
            </motion.div>

            {/* Progress */}
            {isImporting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-indigo-600 border-b-2" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {t('importPage.importing')}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600"
                  />
                </div>
              </motion.div>
            )}

            {/* Greška */}
            {importError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 shadow-lg dark:border-red-800 dark:bg-red-900/20"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <h3 className="mb-1 font-semibold text-red-900 dark:text-red-100">
                      {t('importPage.errorTitle')}
                    </h3>
                    <p className="text-red-700 dark:text-red-200">{importError}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Statistika */}
            {importStats && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-lg dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20"
              >
                <div className="mb-4 flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="mb-1 font-semibold text-green-900 dark:text-green-100">
                      {t('importPage.importSuccess')}
                    </h3>
                    <p className="text-green-700 text-sm dark:text-green-200">
                      {t('importPage.redirecting')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
                  >
                    <div className="font-bold text-2xl text-indigo-600">
                      {importStats.receiptsImported}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-gray-400">
                      {t('importPage.statsReceipts')}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
                  >
                    <div className="font-bold text-2xl text-purple-600">
                      {importStats.devicesImported}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-gray-400">
                      {t('importPage.statsDevices')}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
                  >
                    <div className="font-bold text-2xl text-orange-600">
                      {importStats.merchantsFound.size}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-gray-400">
                      {t('importPage.statsMerchants')}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
                  >
                    <div className="font-bold text-2xl text-green-600">
                      {importStats.totalValue.toLocaleString('sr-RS')} RSD
                    </div>
                    <div className="text-gray-600 text-sm dark:text-gray-400">
                      {t('importPage.statsTotal')}
                    </div>
                  </motion.div>
                </div>

                {importStats.errors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 text-sm"
                  >
                    <p className="mb-2 font-medium text-orange-700 dark:text-orange-300">
                      {t('importPage.warningsTitle', { count: importStats.errors.length })}
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-orange-600 dark:text-orange-400">
                      {importStats.errors.slice(0, 5).map((err: string) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-center text-gray-500 text-sm dark:text-gray-400"
            >
              <p>
                {t('importPage.securityNote')}
                <br />
                {t('importPage.securityNote2')}
              </p>
            </motion.div>
          </>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <>
            {/* Export Description */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20"
            >
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-green-900 text-lg dark:text-green-100">
                <Download className="h-5 w-5" />
                {t('profile.exportData')}
              </h2>
              <p className="text-gray-700 text-sm dark:text-gray-300">
                {t('profile.exportDescription')}
              </p>
            </motion.div>

            {/* Export Format Selection */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6 rounded-2xl bg-white p-8 shadow-lg dark:bg-dark-800"
            >
              <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">
                {t('profile.exportFormat', { defaultValue: 'Izaberite format' })}
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    k: 'json' as const,
                    label: 'JSON',
                    description: t('profile.exportFormatJsonDesc', {
                      defaultValue: 'Struktuirani format, pogodno za backup',
                    }),
                  },
                  {
                    k: 'csv' as const,
                    label: 'CSV',
                    description: t('profile.exportFormatCsvDesc', {
                      defaultValue: 'Tabela za Excel/Spreadsheet',
                    }),
                  },
                  {
                    k: 'all' as const,
                    label: 'ZIP (JSON + CSV)',
                    description: t('profile.exportFormatAllDesc', {
                      defaultValue: 'Kompletna arhiva sa svim formatima',
                    }),
                  },
                ].map((opt) => (
                  <motion.button
                    key={opt.k}
                    type="button"
                    onClick={() => setExportFormat(opt.k)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      exportFormat === opt.k
                        ? 'border-primary-500 bg-primary-50 shadow-lg dark:bg-primary-900/20'
                        : 'border-gray-200 hover:border-primary-300 dark:border-gray-700'
                    }`}
                  >
                    <div className="mb-2 font-bold text-gray-900 text-lg dark:text-gray-100">
                      {opt.label}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-gray-400">
                      {opt.description}
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-gray-600 text-sm dark:text-gray-400">
                  <p className="font-medium">
                    {t('profile.exportInfo', {
                      defaultValue: 'Izvoz uključuje:',
                    })}
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>
                      {t('profile.exportInfoReceipts', { defaultValue: 'Sve fiskalne račune' })}
                    </li>
                    <li>{t('profile.exportInfoDevices', { defaultValue: 'Sve uređaje' })}</li>
                    <li>{t('profile.exportInfoWarranties', { defaultValue: 'Sve garancije' })}</li>
                    <li>{t('profile.exportInfoDocuments', { defaultValue: 'Sve dokumente' })}</li>
                  </ul>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExportData}
                  disabled={isExporting || !user}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  {isExporting ? t('common.loading') : t('profile.export')}
                </motion.button>
              </div>
            </motion.div>

            {/* Import Backup Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-8 dark:border-blue-700 dark:bg-blue-900/10"
            >
              <div className="mb-4 flex items-start gap-3">
                <Upload className="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="mb-1 font-semibold text-blue-900 text-lg dark:text-blue-100">
                    {t('profile.importBackup', { defaultValue: 'Import backup-a' })}
                  </h3>
                  <p className="text-blue-700 text-sm dark:text-blue-200">
                    {t('profile.importDescription')}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleImportClick}
                disabled={isImportingData || !user}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="h-5 w-5" />
                {isImportingData ? t('profile.importing') : t('profile.importButton')}
              </motion.button>

              <input
                ref={dataFileInputRef}
                type="file"
                accept=".json,.zip"
                onChange={handleImportChange}
                className="hidden"
              />
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center text-gray-500 text-sm dark:text-gray-400"
            >
              <p>
                {t('profile.dataSecurityNote', {
                  defaultValue: 'Vaši podaci su sigurni. Sve operacije se izvršavaju lokalno.',
                })}
              </p>
            </motion.div>
          </>
        )}
      </div>
    </PageTransition>
  )
}
