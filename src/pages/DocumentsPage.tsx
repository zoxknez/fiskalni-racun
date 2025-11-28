import type { DocumentType } from '@lib/db'
import { format } from 'date-fns'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  File,
  FilesIcon,
  FileText,
  Heart,
  Loader2,
  Plus,
  Search as SearchIcon,
  Shield,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import { addDocument, deleteDocument, useDocuments } from '@/hooks/useDatabase'
import { logger } from '@/lib/logger'

type DocumentTab =
  | 'id_card'
  | 'passport'
  | 'driver_license'
  | 'vehicle_registration'
  | 'health_insurance'
  | 'other'
  | 'all'

type DocumentTypeLabelKey =
  | 'documents.types.id_card'
  | 'documents.types.passport'
  | 'documents.types.driver_license'
  | 'documents.types.vehicle_registration'
  | 'documents.types.registration_date'
  | 'documents.types.health_insurance'
  | 'documents.types.other'

type DocumentTypeOption = {
  value: DocumentType
  labelKey: DocumentTypeLabelKey
  icon: React.ReactNode
  color: string
}

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    value: 'id_card',
    labelKey: 'documents.types.id_card',
    icon: <Shield className="h-5 w-5" />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    value: 'passport',
    labelKey: 'documents.types.passport',
    icon: <FileText className="h-5 w-5" />,
    color: 'from-purple-500 to-purple-600',
  },
  {
    value: 'driver_license',
    labelKey: 'documents.types.driver_license',
    icon: <FilesIcon className="h-5 w-5" />,
    color: 'from-orange-500 to-orange-600',
  },
  {
    value: 'vehicle_registration',
    labelKey: 'documents.types.vehicle_registration',
    icon: <FileText className="h-5 w-5" />,
    color: 'from-red-500 to-red-600',
  },
  {
    value: 'registration_date',
    labelKey: 'documents.types.registration_date',
    icon: <Calendar className="h-5 w-5" />,
    color: 'from-green-500 to-green-600',
  },
  {
    value: 'health_insurance',
    labelKey: 'documents.types.health_insurance',
    icon: <Heart className="h-5 w-5" />,
    color: 'from-pink-500 to-pink-600',
  },
  {
    value: 'other',
    labelKey: 'documents.types.other',
    icon: <File className="h-5 w-5" />,
    color: 'from-slate-500 to-slate-600',
  },
]

function DocumentsPage() {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  const [activeTab, setActiveTab] = useState<DocumentTab>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedType, setSelectedType] = useState<DocumentType>('id_card')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryReminderDays, setExpiryReminderDays] = useState(30)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real-time database queries
  const allDocuments = useDocuments()
  const loading = !allDocuments

  // Filter and search
  const filteredDocuments = useMemo(() => {
    if (!allDocuments) return []

    let filtered = [...allDocuments]

    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter((doc) => doc.type === activeTab)
    }

    // Search by name
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((doc) => doc.name.toLowerCase().includes(q))
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [allDocuments, activeTab, searchQuery])

  const totalDocumentsCount = allDocuments?.length ?? 0

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file) return

      try {
        setUploadLoading(true)

        // Simulacija upload-a (u realnosti bi bio na Supabase ili drugoj storage službi)
        const fileUrl = URL.createObjectURL(file)
        // Thumbnail generation will be implemented when moving to cloud storage
        const thumbnailUrl = fileUrl

        const docPayload: Parameters<typeof addDocument>[0] = {
          type: selectedType,
          name: file.name,
          fileUrl,
          thumbnailUrl,
          notes: '',
        }

        if (expiryDate) {
          docPayload.expiryDate = new Date(expiryDate)
        }
        if (expiryReminderDays !== 30) {
          docPayload.expiryReminderDays = expiryReminderDays
        }

        await addDocument(docPayload)

        toast.success(t('documents.uploadSuccess'))
        setShowUploadModal(false)
        setSelectedType('id_card')
        setExpiryDate('')
        setExpiryReminderDays(30)
      } catch (error) {
        logger.error('Upload failed:', error)
        toast.error(t('documents.uploadError'))
      } finally {
        setUploadLoading(false)
      }
    },
    [selectedType, expiryDate, expiryReminderDays, t]
  )

  // Handle delete
  const handleDelete = useCallback(
    async (id?: number) => {
      if (!id) return
      if (!window.confirm(t('documents.confirmDelete'))) return

      try {
        await deleteDocument(id)
        toast.success(t('documents.deleteSuccess'))
      } catch (error) {
        logger.error('Delete failed:', error)
        toast.error(t('documents.deleteError'))
      }
    },
    [t]
  )

  const getDocumentTypeInfo = useCallback((type: DocumentType) => {
    return (
      DOCUMENT_TYPES.find((dt) => dt.value === type) ??
      DOCUMENT_TYPES.find((dt) => dt.value === 'other')
    )
  }, [])

  const expiredDocumentsCount = useMemo(() => {
    if (!allDocuments) return 0
    const now = new Date()
    return allDocuments.filter(
      (doc) => doc.expiryDate && new Date(doc.expiryDate).getTime() < now.getTime()
    ).length
  }, [allDocuments])

  const expiringDocumentsCount = useMemo(() => {
    if (!allDocuments) return 0
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return allDocuments.filter(
      (doc) =>
        doc.expiryDate &&
        new Date(doc.expiryDate).getTime() >= now.getTime() &&
        new Date(doc.expiryDate).getTime() <= thirtyDaysFromNow.getTime()
    ).length
  }, [allDocuments])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={prefersReducedMotion ? {} : { rotate: 360 }}
          transition={
            prefersReducedMotion
              ? {}
              : { duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }
          }
          className="h-12 w-12 rounded-full border-4 border-primary-600 border-t-transparent"
        />
      </div>
    )
  }

  return (
    <PageTransition className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 p-8 text-white shadow-xl"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="-right-24 -top-24 absolute h-64 w-64 rounded-full bg-white/15 blur-2xl" />
          <div className="-left-20 -bottom-32 absolute h-72 w-72 rounded-full bg-primary-900/40 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-3 text-primary-50/80">
              <File className="h-6 w-6" />
              <span className="font-semibold text-sm uppercase tracking-wide">
                {t('documents.subtitle')}
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="font-black text-3xl sm:text-4xl">{t('documents.title')}</h1>
              <p className="text-primary-50/90 text-sm leading-relaxed sm:text-base">
                {t('documents.heroDescription')}
              </p>
            </div>
            <motion.button
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              onClick={() => setShowUploadModal(true)}
              className="flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-primary-600 shadow-lg transition-all hover:bg-primary-50"
            >
              <Plus className="h-5 w-5" />
              {t('documents.heroCta')}
            </motion.button>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-4 text-center">
            <div className="rounded-2xl bg-white/10 p-4 shadow-lg backdrop-blur">
              <p className="font-bold text-3xl">{totalDocumentsCount}</p>
              <p className="font-medium text-primary-50/80 text-xs uppercase tracking-wide">
                {t('documents.heroStatsTotal')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 shadow-lg backdrop-blur">
              <p className="font-bold text-3xl">{expiredDocumentsCount}</p>
              <p className="font-medium text-primary-50/80 text-xs uppercase tracking-wide">
                {t('documents.heroStatsExpired')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 shadow-lg backdrop-blur">
              <p className="font-bold text-3xl">{expiringDocumentsCount}</p>
              <p className="font-medium text-primary-50/80 text-xs uppercase tracking-wide">
                {t('documents.heroStatsExpiring')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {expiredDocumentsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">
                  {t('documents.expiredDocuments', { count: expiredDocumentsCount })}
                </p>
                <p className="text-red-800 text-sm dark:text-red-200">
                  {t('documents.updateExpired')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {expiringDocumentsCount > 0 && expiredDocumentsCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20"
          >
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  {t('documents.expiringDocuments', { count: expiringDocumentsCount })}
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t('documents.checkExpiry')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-4"
      >
        {/* Search Bar */}
        <div className="relative">
          <SearchIconInput className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-500 dark:text-dark-400" />
          <input
            type="text"
            placeholder={t('documents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white py-3 pr-4 pl-12 text-dark-900 placeholder:text-dark-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50 dark:placeholder:text-dark-400"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-sm transition-all ${
              activeTab === 'all'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600'
            }`}
          >
            {t('documents.tabAll')} ({totalDocumentsCount})
          </motion.button>
          {DOCUMENT_TYPES.map((type) => (
            <motion.button
              key={type.value}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              onClick={() => setActiveTab(type.value as DocumentTab)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-sm transition-all ${
                activeTab === type.value
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600'
              }`}
            >
              {t(type.labelKey)} ({allDocuments?.filter((d) => d.type === type.value).length || 0})
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border-2 border-dark-300 border-dashed bg-dark-50 p-12 text-center dark:border-dark-600 dark:bg-dark-800"
        >
          <FilesIcon className="mx-auto h-12 w-12 text-dark-400 dark:text-dark-500" />
          <p className="mt-4 font-semibold text-dark-900 text-lg dark:text-dark-50">
            {t('documents.emptyStateTitle')}
          </p>
          <p className="mt-1 text-dark-600 dark:text-dark-400">
            {searchQuery
              ? t('documents.emptySearchDescription')
              : t('documents.emptyStateDescription')}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence>
            {filteredDocuments.map((doc, idx) => {
              const typeInfo = getDocumentTypeInfo(doc.type)
              const typeLabelKey = typeInfo?.labelKey ?? 'documents.types.other'
              const typeIcon = typeInfo?.icon ?? <File className="h-5 w-5" />
              const typeGradient = typeInfo?.color ?? 'from-slate-500 to-slate-600'
              const isExpired = doc.expiryDate && new Date(doc.expiryDate).getTime() < Date.now()

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                    isExpired
                      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-dark-200 bg-white hover:border-primary-300 dark:border-dark-700 dark:bg-dark-800'
                  }`}
                >
                  {/* Type Badge */}
                  <div
                    className={`absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-gradient-to-r ${typeGradient} px-3 py-1 font-semibold text-sm text-white shadow-lg`}
                  >
                    {typeIcon}
                    <span className="hidden sm:inline">{t(typeLabelKey)}</span>
                  </div>

                  {/* Expired Badge */}
                  {isExpired && (
                    <div className="absolute top-3 left-3 rounded-lg bg-red-600 px-3 py-1 font-bold text-white text-xs">
                      {t('documents.expiredBadge')}
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-4 p-6">
                    {/* Title */}
                    <div>
                      <h3 className="line-clamp-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
                        {doc.name}
                      </h3>
                    </div>

                    {/* Dates */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-dark-600 dark:text-dark-400">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {t('documents.addedOn')} {format(new Date(doc.createdAt), 'dd.MM.yyyy')}
                        </span>
                      </div>
                      {doc.expiryDate && (
                        <div
                          className={`flex items-center gap-2 ${
                            isExpired
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-dark-600 dark:text-dark-400'
                          }`}
                        >
                          <Zap className="h-4 w-4 flex-shrink-0" />
                          <span>
                            {t('documents.expiresOn')}{' '}
                            {format(new Date(doc.expiryDate), 'dd.MM.yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {doc.notes && (
                      <p className="line-clamp-2 text-dark-600 text-sm dark:text-dark-400">
                        {doc.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <motion.a
                        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-lg bg-primary-600 py-2 text-center font-semibold text-sm text-white transition-all hover:bg-primary-700 dark:hover:bg-primary-500"
                      >
                        {t('documents.view')}
                      </motion.a>
                      <motion.button
                        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                        onClick={() => {
                          if (doc.id) handleDelete(doc.id)
                        }}
                        className="rounded-lg bg-red-100 p-2 text-red-600 transition-all hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-bold text-2xl text-dark-900 dark:text-dark-50">
                  {t('documents.addDocument')}
                </h2>
                <motion.button
                  whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg p-2 hover:bg-dark-100 dark:hover:bg-dark-700"
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {/* Type Selection */}
                <div>
                  <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
                    {t('documents.documentTypeLabel')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DOCUMENT_TYPES.map((type) => (
                      <motion.button
                        key={type.value}
                        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                        onClick={() => setSelectedType(type.value)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-all ${
                          selectedType === type.value
                            ? `bg-gradient-to-r ${type.color} text-white shadow-lg`
                            : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                        }`}
                      >
                        {type.icon}
                        <span className="hidden sm:inline">{t(type.labelKey)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
                    {t('documents.selectFile')}
                  </label>
                  <motion.div
                    whileHover={prefersReducedMotion ? {} : { borderColor: 'rgb(59, 130, 246)' }}
                    className="relative cursor-pointer rounded-xl border-2 border-dark-300 border-dashed bg-dark-50 p-8 text-center transition-all hover:bg-dark-100 dark:border-dark-600 dark:bg-dark-800/50 dark:hover:bg-dark-700"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-8 w-8 text-primary-600" />
                    <p className="mt-2 font-semibold text-dark-900 dark:text-dark-50">
                      {t('documents.dropFile')}
                    </p>
                    <p className="text-dark-600 text-sm dark:text-dark-400">
                      {t('documents.fileFormatsHint')}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                  </motion.div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
                    {t('documents.expiryDateLabel')}
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-dark-300 bg-white px-4 py-2 text-dark-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50"
                  />
                </div>

                {/* Expiry Reminder Days */}
                <div>
                  <label className="mb-3 block font-semibold text-dark-900 text-sm dark:text-dark-50">
                    {t('documents.expiryReminderLabel', { count: expiryReminderDays })}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="90"
                    value={expiryReminderDays}
                    onChange={(e) => setExpiryReminderDays(Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                  <div className="mt-2 flex items-center justify-between text-dark-600 text-xs dark:text-dark-400">
                    <span>{t('common.days', { count: 1 })}</span>
                    <span>{t('common.days', { count: 90 })}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploadLoading}
                    className="flex-1 rounded-lg border-2 border-dark-300 py-3 font-semibold text-dark-900 transition-all hover:bg-dark-50 dark:border-dark-600 dark:text-dark-50 dark:hover:bg-dark-700"
                  >
                    {t('common.cancel')}
                  </motion.button>
                  <motion.button
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 py-3 font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                  >
                    {uploadLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t('documents.uploading')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        {t('documents.uploadButton')}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

// Helper component for search icon
function SearchIconInput(props: React.SVGProps<SVGSVGElement>) {
  return <SearchIcon {...props} />
}

export default memo(DocumentsPage)
