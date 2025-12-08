/**
 * useFormState - Generic Form State Management Hook
 *
 * Handles common form patterns:
 * - Create/Edit/Delete modal states
 * - Form data management with reset
 * - Error handling
 * - Loading states
 *
 * Reduces boilerplate across pages like DealsPage, SubscriptionsPage, etc.
 */

import { useCallback, useState } from 'react'

export interface UseFormStateOptions<T extends object> {
  /** Initial form data (used when creating new items) */
  initialData: T
  /** Callback when creating a new item */
  onCreate?: (data: T) => Promise<boolean | void>
  /** Callback when updating an existing item */
  onUpdate?: (id: string | number, data: T) => Promise<boolean | void>
  /** Callback when deleting an item */
  onDelete?: (id: string | number) => Promise<boolean | void>
}

export interface UseFormStateReturn<T extends object, TItem = unknown> {
  // Modal states
  isCreating: boolean
  editingItem: TItem | null
  deletingItem: TItem | null

  // Form data
  formData: T
  setFormData: React.Dispatch<React.SetStateAction<T>>
  updateField: <K extends keyof T>(field: K, value: T[K]) => void

  // Error state
  error: string | null
  setError: (error: string | null) => void
  clearError: () => void

  // Loading state
  isSubmitting: boolean

  // Actions
  startCreate: () => void
  startEdit: (item: TItem, mapToFormData: (item: TItem) => T) => void
  startDelete: (item: TItem) => void
  cancel: () => void
  reset: () => void

  // Submit handlers
  handleSubmit: () => Promise<void>
  handleDelete: () => Promise<void>
}

/**
 * Generic form state management hook
 *
 * @param options - Configuration options
 * @returns Form state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   isCreating,
 *   editingItem,
 *   formData,
 *   updateField,
 *   error,
 *   startCreate,
 *   startEdit,
 *   cancel,
 *   handleSubmit
 * } = useFormState({
 *   initialData: { name: '', amount: '' },
 *   onCreate: async (data) => { await createItem(data); return true; },
 *   onUpdate: async (id, data) => { await updateItem(id, data); return true; }
 * });
 * ```
 */
export function useFormState<
  T extends object,
  TItem extends { id?: string | number } = { id?: string | number },
>(options: UseFormStateOptions<T>): UseFormStateReturn<T, TItem> {
  const { initialData, onCreate, onUpdate, onDelete } = options

  // Modal states
  const [isCreating, setIsCreating] = useState(false)
  const [editingItem, setEditingItem] = useState<TItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<TItem | null>(null)

  // Form data
  const [formData, setFormData] = useState<T>(initialData)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update a single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Reset form to initial state
  const reset = useCallback(() => {
    setFormData(initialData)
    setError(null)
  }, [initialData])

  // Start creating a new item
  const startCreate = useCallback(() => {
    setIsCreating(true)
    setEditingItem(null)
    setDeletingItem(null)
    setFormData(initialData)
    setError(null)
  }, [initialData])

  // Start editing an existing item
  const startEdit = useCallback((item: TItem, mapToFormData: (item: TItem) => T) => {
    setEditingItem(item)
    setIsCreating(false)
    setDeletingItem(null)
    setFormData(mapToFormData(item))
    setError(null)
  }, [])

  // Start delete confirmation
  const startDelete = useCallback((item: TItem) => {
    setDeletingItem(item)
  }, [])

  // Cancel all modals
  const cancel = useCallback(() => {
    setIsCreating(false)
    setEditingItem(null)
    setDeletingItem(null)
    setError(null)
  }, [])

  // Handle form submission (create or update)
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (editingItem?.id !== undefined) {
        // Update existing item
        if (onUpdate) {
          const result = await onUpdate(editingItem.id, formData)
          if (result !== false) {
            setEditingItem(null)
          }
        }
      } else {
        // Create new item
        if (onCreate) {
          const result = await onCreate(formData)
          if (result !== false) {
            setIsCreating(false)
            setFormData(initialData)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [editingItem, formData, initialData, onCreate, onUpdate])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingItem?.id) return

    setIsSubmitting(true)
    setError(null)

    try {
      if (onDelete) {
        const result = await onDelete(deletingItem.id)
        if (result !== false) {
          setDeletingItem(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [deletingItem, onDelete])

  return {
    // Modal states
    isCreating,
    editingItem,
    deletingItem,

    // Form data
    formData,
    setFormData,
    updateField,

    // Error state
    error,
    setError,
    clearError,

    // Loading state
    isSubmitting,

    // Actions
    startCreate,
    startEdit,
    startDelete,
    cancel,
    reset,

    // Submit handlers
    handleSubmit,
    handleDelete,
  }
}

/**
 * Simple toggle hook for boolean states
 * Useful for simple show/hide toggles
 */
export function useToggleState(initialValue = false) {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => setValue((v) => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])

  return { value, setValue, toggle, setTrue, setFalse }
}

/**
 * Hook for managing confirmation dialogs
 */
export function useConfirmDialog<T = unknown>() {
  const [item, setItem] = useState<T | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((itemToConfirm: T) => {
    setItem(itemToConfirm)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setItem(null)
    setIsOpen(false)
  }, [])

  const confirm = useCallback(
    async (onConfirm: (item: T) => Promise<void>) => {
      if (item) {
        await onConfirm(item)
        close()
      }
    },
    [item, close]
  )

  return { item, isOpen, open, close, confirm }
}

export default useFormState
