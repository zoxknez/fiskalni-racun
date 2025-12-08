/**
 * DocumentsPage
 *
 * Page for managing personal documents (ID, passport, driver's license, etc.)
 * Refactored to use modular components
 */

import type { DocumentType } from '@lib/db'
import { format } from 'date-fns'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, File, FilesIcon, Plus, Search as SearchIcon, Zap } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import { addDocument, deleteDocument, updateDocument, useDocuments } from '@/hooks/useDatabase'
import { logger } from '@/lib/logger'
import { compressAndUpload } from '@/lib/upload'
import { DocumentCard, EditDocumentModal, ImageLightbox, UploadDocumentModal } from './components'
import { DOCUMENT_TYPES, type Document, type DocumentTab } from './types'

function DocumentsPage() {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  // UI State
  const [activeTab, setActiveTab] = useState<DocumentTab>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)

  // Edit modal state
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<DocumentType>('id_card')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLoading, setEditLoading] = useState(false)

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

  // Document stats
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

  // Open edit modal
  const openEditModal = useCallback((doc: Document) => {
    setEditingDocument(doc)
    setEditName(doc.name)
    setEditType(doc.type)
    setEditExpiryDate(doc.expiryDate ? format(new Date(doc.expiryDate), 'yyyy-MM-dd') : '')
    setEditNotes(doc.notes || '')
  }, [])

  // Close edit modal
  const closeEditModal = useCallback(() => {
    setEditingDocument(null)
    setEditName('')
    setEditType('id_card')
    setEditExpiryDate('')
    setEditNotes('')
  }, [])

  // Handle edit save
  const handleEditSave = useCallback(async () => {
    if (!editingDocument?.id) return

    try {
      setEditLoading(true)
      const updates: Parameters<typeof updateDocument>[1] = {
        name: editName,
        type: editType,
        notes: editNotes,
      }
      if (editExpiryDate) {
        updates.expiryDate = new Date(editExpiryDate)
      }
      await updateDocument(editingDocument.id, updates)
      toast.success(t('documents.editSuccess'))
      closeEditModal()
    } catch (error) {
      logger.error('Edit failed:', error)
      toast.error(t('documents.editError'))
    } finally {
      setEditLoading(false)
    }
  }, [editingDocument, editName, editType, editExpiryDate, editNotes, t, closeEditModal])

  // Lightbox handlers
  const openLightbox = useCallback((url: string) => {
    setLightboxUrl(url)
    setLightboxZoom(1)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxUrl(null)
    setLightboxZoom(1)
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File, selectedType: DocumentType, expiryDate: string, reminderDays: number) => {
      if (!file) return

      try {
        setUploadLoading(true)

        // Upload to Vercel Blob with compression
        const uploadResult = await compressAndUpload(file, 'documents')

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Upload failed')
        }

        const fileUrl = uploadResult.url
        const thumbnailUrl = uploadResult.url

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
        if (reminderDays !== 30) {
          docPayload.expiryReminderDays = reminderDays
        }

        await addDocument(docPayload)

        toast.success(t('documents.uploadSuccess'))
        setShowUploadModal(false)
      } catch (error) {
        logger.error('Upload failed:', error)
        toast.error(t('documents.uploadError'))
      } finally {
        setUploadLoading(false)
      }
    },
    [t]
  )

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
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
    <PageTransition className="space-y-6 pb-10 sm:space-y-10">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 p-6 text-white shadow-xl sm:p-8"
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
              className="flex w-fit items-center gap-3 rounded-xl bg-white px-6 py-4 font-bold text-lg text-primary-600 shadow-xl transition-all hover:bg-primary-50 hover:shadow-2xl"
            >
              <Plus className="h-6 w-6" />
              {t('documents.heroCta')}
            </motion.button>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center sm:max-w-sm sm:grid-cols-2 sm:gap-4">
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
          <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-500 dark:text-dark-400" />
          <input
            type="text"
            placeholder={t('documents.searchPlaceholder')}
            aria-label={t('documents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white py-3 pr-4 pl-12 text-dark-900 placeholder:text-dark-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50 dark:placeholder:text-dark-400"
          />
        </div>

        {/* Tabs */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-xs transition-all sm:px-3 sm:text-sm ${
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
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium text-xs transition-all sm:px-3 sm:text-sm ${
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
          className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence>
            {filteredDocuments.map((doc, idx) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                index={idx}
                onView={openLightbox}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadDocumentModal
            onUpload={handleFileUpload}
            onClose={() => setShowUploadModal(false)}
            isLoading={uploadLoading}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingDocument && (
          <EditDocumentModal
            document={editingDocument}
            name={editName}
            type={editType}
            expiryDate={editExpiryDate}
            notes={editNotes}
            isLoading={editLoading}
            onNameChange={setEditName}
            onTypeChange={setEditType}
            onExpiryDateChange={setEditExpiryDate}
            onNotesChange={setEditNotes}
            onSave={handleEditSave}
            onClose={closeEditModal}
          />
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <ImageLightbox
            url={lightboxUrl}
            zoom={lightboxZoom}
            onZoomChange={setLightboxZoom}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

export default memo(DocumentsPage)
