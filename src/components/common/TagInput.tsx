/**
 * TagInput Component
 *
 * Allows users to add, remove, and manage custom tags for receipts
 */

import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Tag, X } from 'lucide-react'
import { memo, useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Predefined tag suggestions
export const SUGGESTED_TAGS = [
  'posao',
  'lično',
  'putovanje',
  'porodica',
  'poklon',
  'povrat',
  'garancija',
  'pretplata',
  'hitno',
  'planiran',
] as const

// Tag colors for visual distinction
export const TAG_COLORS: Record<string, string> = {
  posao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lično: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  putovanje: 'bg-green-500/20 text-green-400 border-green-500/30',
  porodica: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  poklon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  povrat: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  garancija: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  pretplata: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  hitno: 'bg-red-500/20 text-red-400 border-red-500/30',
  planiran: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
}

const DEFAULT_TAG_COLOR = 'bg-dark-500/20 text-dark-300 border-dark-500/30'

export function getTagColor(tag: string): string {
  const normalizedTag = tag.toLowerCase()
  return TAG_COLORS[normalizedTag] ?? DEFAULT_TAG_COLOR
}

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  disabled?: boolean
  className?: string
}

function TagInputComponent({
  tags,
  onChange,
  maxTags = 10,
  disabled = false,
  className = '',
}: TagInputProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const addTag = useCallback(
    (tag: string) => {
      const normalizedTag = tag.trim().toLowerCase()
      if (normalizedTag && !tags.includes(normalizedTag) && tags.length < maxTags) {
        onChange([...tags, normalizedTag])
        setInputValue('')
      }
    },
    [tags, onChange, maxTags]
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove))
    },
    [tags, onChange]
  )

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return SUGGESTED_TAGS.filter((s) => !tags.includes(s))
    return SUGGESTED_TAGS.filter(
      (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
    )
  }, [inputValue, tags])

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Select from suggestions if one is highlighted
        if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
          addTag(filteredSuggestions[selectedSuggestionIndex])
          setSelectedSuggestionIndex(-1)
        } else if (inputValue.trim()) {
          addTag(inputValue)
        }
      } else if (e.key === 'ArrowDown' && showSuggestions) {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1))
      } else if (e.key === 'ArrowUp' && showSuggestions) {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => Math.max(prev - 1, -1))
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        const lastTag = tags[tags.length - 1]
        if (lastTag) {
          removeTag(lastTag)
        }
      }
    },
    [
      inputValue,
      tags,
      addTag,
      removeTag,
      showSuggestions,
      selectedSuggestionIndex,
      filteredSuggestions,
    ]
  )

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label
        htmlFor={inputId}
        className="flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300"
      >
        <Tag className="h-4 w-4" />
        {t('tags.label', 'Oznake')}
        <span className="text-dark-400">
          ({tags.length}/{maxTags})
        </span>
      </label>

      {/* Tags Container */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dark-200 bg-white p-2 dark:border-dark-700 dark:bg-dark-800">
        <AnimatePresence mode="popLayout">
          {tags.map((tag) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium text-xs ${getTagColor(tag)}`}
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 rounded-full p-0.5 transition-colors hover:bg-white/20"
                  aria-label={t('tags.remove', 'Ukloni oznaku {{tag}}', { tag })}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Input */}
        {!disabled && tags.length < maxTags && (
          <div className="relative flex-1">
            <input
              id={inputId}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={t('tags.placeholder', 'Dodaj oznaku...')}
              className="w-full min-w-[120px] border-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-dark-400"
              disabled={disabled}
            />

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 z-50 mt-1 w-full min-w-[200px] rounded-lg border border-dark-200 bg-white p-1 shadow-lg dark:border-dark-700 dark:bg-dark-800"
                >
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addTag(suggestion)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-dark-100 dark:hover:bg-dark-700"
                    >
                      <Plus className="h-3 w-3 text-dark-400" />
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${getTagColor(suggestion)}`}
                      >
                        {suggestion}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Quick Add Suggestions */}
      {!disabled && tags.length < maxTags && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_TAGS.filter((s) => !tags.includes(s))
            .slice(0, 5)
            .map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="inline-flex items-center gap-1 rounded-full border border-dark-300 border-dashed px-2 py-0.5 text-dark-500 text-xs transition-colors hover:border-primary-500 hover:text-primary-500 dark:border-dark-600 dark:text-dark-400"
              >
                <Plus className="h-3 w-3" />
                {suggestion}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export const TagInput = memo(TagInputComponent)
