/**
 * Backup/Restore Card Component
 *
 * UI for managing backups - download, upload, and cloud backup options
 */

import { track } from '@lib/analytics'
import { formatCurrency } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  Cloud,
  Download,
  FileJson,
  HardDrive,
  Info,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { memo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { logger } from '@/lib/logger'
import {
  type BackupData,
  downloadBackup,
  getBackupInfo,
  readBackupFile,
  restoreFromBackup,
  validateBackup,
} from '@/services/backupService'

interface BackupRestoreCardProps {
  className?: string
}

export const BackupRestoreCard = memo(({ className = '' }: BackupRestoreCardProps) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<BackupData | null>(null)
  const [mergeMode, setMergeMode] = useState(true)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadBackup()
      track('backup_download', {})
      toast.success(t('backup.downloadSuccess'))
    } catch (error) {
      logger.error('Download backup failed:', error)
      toast.error(t('backup.downloadError'))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const backupData = await readBackupFile(file)
      const validation = validateBackup(backupData)

      if (!validation.valid) {
        toast.error(t('backup.invalidFile'))
        return
      }

      setPendingRestore(backupData)
    } catch (error) {
      logger.error('Read backup file failed:', error)
      toast.error(t('backup.readError'))
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRestore = async () => {
    if (!pendingRestore) return

    setIsRestoring(true)
    try {
      const result = await restoreFromBackup(pendingRestore, {
        merge: mergeMode,
        skipDuplicates: true,
      })

      track('backup_restore', {
        receipts: result.receiptsRestored,
        devices: result.devicesRestored,
      })

      toast.success(
        t('backup.restoreSuccess', {
          receipts: result.receiptsRestored,
          devices: result.devicesRestored,
        })
      )

      setPendingRestore(null)

      // Reload the page to reflect changes
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      logger.error('Restore backup failed:', error)
      toast.error(t('backup.restoreError'))
    } finally {
      setIsRestoring(false)
    }
  }

  const backupInfo = pendingRestore ? getBackupInfo(pendingRestore) : null

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Download Backup */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary-100 p-3 dark:bg-primary-900/20">
            <Download className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-dark-900 text-lg dark:text-dark-50">
              {t('backup.downloadTitle')}
            </h3>
            <p className="mb-4 text-dark-500 text-sm dark:text-dark-400">
              {t('backup.downloadDescription')}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 font-medium text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>{t('backup.downloading')}</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-5 w-5" />
                  <span>{t('backup.downloadButton')}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Restore Backup */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-800"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/20">
            <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-dark-900 text-lg dark:text-dark-50">
              {t('backup.restoreTitle')}
            </h3>
            <p className="mb-4 text-dark-500 text-sm dark:text-dark-400">
              {t('backup.restoreDescription')}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dark-200 border-dashed bg-dark-50 px-4 py-2.5 font-medium text-dark-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200 dark:hover:border-emerald-500"
            >
              <FileJson className="h-5 w-5" />
              <span>{t('backup.selectFile')}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Pending Restore Preview */}
      <AnimatePresence>
        {pendingRestore && backupInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 dark:border-amber-600 dark:bg-amber-900/20"
          >
            <div className="mb-4 flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Info className="h-5 w-5" />
              <span className="font-semibold">{t('backup.reviewBackup')}</span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-dark-500 dark:text-dark-400">{t('backup.created')}:</span>
                <p className="font-medium text-dark-900 dark:text-dark-50">
                  {backupInfo.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-dark-500 dark:text-dark-400">{t('backup.version')}:</span>
                <p className="font-medium text-dark-900 dark:text-dark-50">{backupInfo.version}</p>
              </div>
              <div>
                <span className="text-dark-500 dark:text-dark-400">
                  {t('backup.receiptsCount')}:
                </span>
                <p className="font-medium text-dark-900 dark:text-dark-50">
                  {backupInfo.stats.receiptsCount}
                </p>
              </div>
              <div>
                <span className="text-dark-500 dark:text-dark-400">
                  {t('backup.devicesCount')}:
                </span>
                <p className="font-medium text-dark-900 dark:text-dark-50">
                  {backupInfo.stats.devicesCount}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-dark-500 dark:text-dark-400">{t('backup.totalAmount')}:</span>
                <p className="font-medium text-dark-900 dark:text-dark-50">
                  {formatCurrency(backupInfo.stats.totalAmount)}
                </p>
              </div>
            </div>

            {/* Merge mode toggle */}
            <div className="mb-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={mergeMode}
                  onChange={(e) => setMergeMode(e.target.checked)}
                  className="h-5 w-5 rounded border-dark-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-dark-700 text-sm dark:text-dark-300">
                  {t('backup.mergeMode')}
                </span>
              </label>
              <p className="mt-1 ml-8 text-dark-500 text-xs dark:text-dark-400">
                {mergeMode ? t('backup.mergeModeHint') : t('backup.replaceModeHint')}
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-white shadow-emerald-500/30 shadow-lg transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>{t('backup.restoring')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>{t('backup.confirmRestore')}</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPendingRestore(null)}
                disabled={isRestoring}
                className="rounded-xl border border-dark-200 px-4 py-2.5 font-medium text-dark-600 transition-colors hover:bg-dark-50 disabled:opacity-50 dark:border-dark-600 dark:text-dark-400 dark:hover:bg-dark-700"
              >
                {t('common.cancel')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cloud Backup (Coming Soon) */}
      <motion.div className="rounded-2xl bg-gradient-to-br from-dark-100 to-dark-200 p-6 dark:from-dark-700 dark:to-dark-800">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-dark-200 p-3 dark:bg-dark-600">
            <Cloud className="h-6 w-6 text-dark-400 dark:text-dark-500" />
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold text-dark-600 text-lg dark:text-dark-400">
                {t('backup.cloudTitle')}
              </h3>
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-primary-600 text-xs dark:bg-primary-900/20 dark:text-primary-400">
                {t('common.comingSoon')}
              </span>
            </div>
            <p className="text-dark-400 text-sm dark:text-dark-500">
              {t('backup.cloudDescription')}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
})

BackupRestoreCard.displayName = 'BackupRestoreCard'

export default BackupRestoreCard
