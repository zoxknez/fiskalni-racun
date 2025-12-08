import type { Tag } from '@lib/db'
import { cn } from '@lib/utils'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { memo, useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TagBadge } from '@/components/ui/TagBadge'
import { TAG_COLORS, useTags } from '@/hooks/useTags'

export default function TagsManagementPage() {
  const { t } = useTranslation()
  const { tags, createTag, updateTag, deleteTag, getNextColor, isLoading } = useTags()
  const shouldReduceMotion = useReducedMotion()

  const [isCreating, setIsCreating] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[0] ?? '#3B82F6')
  const [error, setError] = useState<string | null>(null)

  const headingId = 'tags-heading'

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    setNewTagName('')
    setNewTagColor(getNextColor())
    setError(null)
  }, [getNextColor])

  const handleCreate = useCallback(async () => {
    try {
      await createTag(newTagName, newTagColor)
      setIsCreating(false)
      setNewTagName('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating tag')
    }
  }, [createTag, newTagName, newTagColor])

  const handleStartEdit = useCallback((tag: Tag) => {
    setEditingTag(tag)
    setNewTagName(tag.name)
    setNewTagColor(tag.color)
    setError(null)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!editingTag?.id) return
    try {
      await updateTag(editingTag.id, { name: newTagName, color: newTagColor })
      setEditingTag(null)
      setNewTagName('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating tag')
    }
  }, [editingTag, updateTag, newTagName, newTagColor])

  const handleDelete = useCallback(async () => {
    if (!deletingTag?.id) return
    try {
      await deleteTag(deletingTag.id)
      setDeletingTag(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting tag')
    }
  }, [deletingTag, deleteTag])

  const handleCancel = useCallback(() => {
    setIsCreating(false)
    setEditingTag(null)
    setNewTagName('')
    setError(null)
  }, [])

  const animationProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1
          id={headingId}
          className="flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-white"
        >
          <Tags className="h-7 w-7 text-primary-500" />
          {t('tags.manageTags')}
        </h1>
        <p className="mt-1 text-dark-500 dark:text-dark-400">{t('tags.label')}</p>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            {...animationProps}
            className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Button / Form */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          {isCreating ? (
            <motion.div
              key="create-form"
              {...animationProps}
              className="rounded-lg border border-dark-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-800"
            >
              <TagForm
                name={newTagName}
                color={newTagColor}
                onNameChange={setNewTagName}
                onColorChange={setNewTagColor}
                onSubmit={handleCreate}
                onCancel={handleCancel}
                submitLabel={t('common.create')}
              />
            </motion.div>
          ) : (
            <motion.button
              key="create-button"
              {...animationProps}
              type="button"
              onClick={handleStartCreate}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dark-300 border-dashed bg-white px-4 py-3 text-dark-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300 dark:hover:border-primary-400 dark:hover:text-primary-400"
            >
              <Plus className="h-5 w-5" />
              {t('tags.addTag')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Tags List */}
      {tags.length > 0 ? (
        <ul className="space-y-2" aria-labelledby={headingId}>
          <AnimatePresence>
            {tags.map((tag) => (
              <motion.li key={tag.id} layout {...animationProps}>
                {editingTag?.id === tag.id ? (
                  <div className="rounded-lg border border-primary-500 bg-white p-4 dark:bg-dark-800">
                    <TagForm
                      name={newTagName}
                      color={newTagColor}
                      onNameChange={setNewTagName}
                      onColorChange={setNewTagColor}
                      onSubmit={handleUpdate}
                      onCancel={handleCancel}
                      submitLabel={t('common.save')}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-dark-200 bg-white px-4 py-3 dark:border-dark-600 dark:bg-dark-800">
                    <TagBadge name={tag.name} color={tag.color} size="md" />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tag)}
                        className="rounded-lg p-2 text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-700 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200"
                        aria-label={t('tags.editTag')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTag(tag)}
                        className="rounded-lg p-2 text-dark-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-dark-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        aria-label={t('tags.deleteTag')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="rounded-lg bg-dark-100 py-12 text-center dark:bg-dark-800">
          <Tags className="mx-auto mb-3 h-12 w-12 text-dark-400 dark:text-dark-500" />
          <p className="text-dark-500 dark:text-dark-400">{t('tags.noTags')}</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deletingTag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDeletingTag(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-dark-800"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="font-semibold text-dark-900 text-lg dark:text-white">
                  {t('tags.deleteTag')}
                </h2>
              </div>
              <p className="mb-6 text-dark-600 dark:text-dark-300">
                {t('tags.deleteConfirm', { name: deletingTag.name })}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingTag(null)}
                  className="flex-1 rounded-lg bg-dark-100 px-4 py-2.5 font-medium text-dark-700 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Tag Form Component
interface TagFormProps {
  name: string
  color: string
  onNameChange: (name: string) => void
  onColorChange: (color: string) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}

const TagForm = memo(function TagForm({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  onCancel,
  submitLabel,
}: TagFormProps) {
  const { t } = useTranslation()
  const inputId = useId()

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-2">
        <span className="text-dark-500 text-sm dark:text-dark-400">{t('common.preview')}:</span>
        <TagBadge name={name || '...'} color={color} size="md" />
      </div>

      {/* Name Input */}
      <div>
        <label
          htmlFor={inputId}
          className="mb-1 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('tags.tagName')}
        </label>
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('tags.placeholder')}
          className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2 text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:placeholder:text-dark-500"
        />
      </div>

      {/* Color Picker */}
      <div>
        <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
          {t('tags.tagColor')}
        </label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={cn(
                'h-8 w-8 rounded-full transition-transform hover:scale-110',
                color === c && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-800'
              )}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!name.trim()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center rounded-lg bg-dark-100 px-4 py-2.5 font-medium text-dark-700 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
})
