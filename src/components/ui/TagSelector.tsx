import type { Tag } from '@lib/db'
import { cn } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TAG_COLORS, useTags } from '@/hooks/useTags'
import { TagBadge, TagList } from './TagBadge'

interface TagSelectorProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  className?: string
  placeholder?: string
}

/**
 * A dropdown component for selecting and creating tags
 */
export const TagSelector = memo(function TagSelector({
  selectedTags,
  onChange,
  className,
  placeholder,
}: TagSelectorProps) {
  const { t } = useTranslation()
  const { tags, createTag, getNextColor } = useTags()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTagColor, setNewTagColor] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
        setIsCreating(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Set next color when opening create mode
  useEffect(() => {
    if (isCreating) {
      setNewTagColor(getNextColor())
    }
  }, [isCreating, getNextColor])

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedTagObjects = tags.filter((t) => selectedTags.includes(t.name))

  const handleToggleTag = useCallback(
    (tagName: string) => {
      if (selectedTags.includes(tagName)) {
        onChange(selectedTags.filter((t) => t !== tagName))
      } else {
        onChange([...selectedTags, tagName])
      }
    },
    [selectedTags, onChange]
  )

  const handleCreateTag = useCallback(async () => {
    if (!searchQuery.trim()) return

    try {
      await createTag(searchQuery.trim(), newTagColor)
      onChange([...selectedTags, searchQuery.trim()])
      setSearchQuery('')
      setIsCreating(false)
    } catch (error) {
      // Tag might already exist, just add it
      if (error instanceof Error && error.message.includes('already exists')) {
        handleToggleTag(searchQuery.trim())
        setSearchQuery('')
      }
    }
  }, [searchQuery, newTagColor, createTag, onChange, selectedTags, handleToggleTag])

  const handleRemoveTag = useCallback(
    (tagName: string) => {
      onChange(selectedTags.filter((t) => t !== tagName))
    },
    [selectedTags, onChange]
  )

  const showCreateOption =
    searchQuery.trim() && !tags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase())

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button / Selected Tags */}
      <div
        className="flex min-h-[42px] cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-dark-200 bg-white px-3 py-2 transition-colors hover:border-dark-300 dark:border-dark-600 dark:bg-dark-800 dark:hover:border-dark-500"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={0}
      >
        {selectedTagObjects.length > 0 ? (
          <TagList tags={selectedTagObjects} size="sm" removable onRemove={handleRemoveTag} />
        ) : (
          <span className="text-dark-400 dark:text-dark-500">
            {placeholder || t('tags.selectTags')}
          </span>
        )}
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-dark-400 transition-transform dark:text-dark-500',
            isOpen && 'rotate-180'
          )}
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-lg border border-dark-200 bg-white shadow-lg dark:border-dark-600 dark:bg-dark-800"
          >
            {/* Search Input */}
            <div className="border-dark-200 border-b p-2 dark:border-dark-600">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && showCreateOption) {
                    e.preventDefault()
                    handleCreateTag()
                  }
                }}
                placeholder={t('tags.searchOrCreate')}
                className="w-full rounded-md border-0 bg-dark-100 px-3 py-2 text-dark-900 text-sm placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:text-white dark:placeholder:text-dark-500"
              />
            </div>

            {/* Tags List */}
            <div className="max-h-48 overflow-y-auto p-2">
              {filteredTags.length > 0 ? (
                <ul className="space-y-1">
                  {filteredTags.map((tag) => (
                    <TagOption
                      key={tag.id}
                      tag={tag}
                      isSelected={selectedTags.includes(tag.name)}
                      onToggle={() => handleToggleTag(tag.name)}
                    />
                  ))}
                </ul>
              ) : !showCreateOption ? (
                <p className="py-2 text-center text-dark-500 text-sm">{t('tags.noTags')}</p>
              ) : null}

              {/* Create New Tag Option */}
              {showCreateOption && (
                <div className="mt-2 border-dark-200 border-t pt-2 dark:border-dark-600">
                  {isCreating ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TagBadge name={searchQuery.trim()} color={newTagColor} size="md" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            className={cn(
                              'h-6 w-6 rounded-full transition-transform hover:scale-110',
                              newTagColor === color &&
                                'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-800'
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateTag}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-primary-700"
                        >
                          <Check className="h-4 w-4" />
                          {t('common.create')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreating(false)}
                          className="rounded-md bg-dark-200 px-3 py-1.5 font-medium text-dark-700 text-sm transition-colors hover:bg-dark-300 dark:bg-dark-700 dark:text-dark-200 dark:hover:bg-dark-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreating(true)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-primary-600 text-sm transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    >
                      <Plus className="h-4 w-4" />
                      {t('tags.createTag', { name: searchQuery.trim() })}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

interface TagOptionProps {
  tag: Tag
  isSelected: boolean
  onToggle: () => void
}

const TagOption = memo(function TagOption({ tag, isSelected, onToggle }: TagOptionProps) {
  return (
    <li
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-dark-100 dark:hover:bg-dark-700'
      )}
    >
      <TagBadge name={tag.name} color={tag.color} size="sm" />
      {isSelected && <Check className="ml-auto h-4 w-4 text-primary-600 dark:text-primary-400" />}
    </li>
  )
})
