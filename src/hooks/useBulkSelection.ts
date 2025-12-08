/**
 * useBulkSelection Hook
 *
 * Manages multi-select state for bulk operations on lists.
 */

import { useCallback, useMemo, useState } from 'react'

export interface UseBulkSelectionResult<T> {
  selectedIds: Set<string>
  selectedItems: T[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  select: (id: string) => void
  deselect: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  toggleAll: () => void
  isAllSelected: boolean
  hasSelection: boolean
  selectionCount: number
  isSelectionMode: boolean
  enterSelectionMode: () => void
  exitSelectionMode: () => void
}

export function useBulkSelection<T extends { id?: string }>(items: T[]): UseBulkSelectionResult<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const itemIds = useMemo(
    () => new Set(items.map((item) => item.id).filter(Boolean) as string[]),
    [items]
  )

  const selectedItems = useMemo(
    () => items.filter((item) => item.id && selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const select = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id))
  }, [])

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(itemIds))
  }, [itemIds])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === itemIds.size) {
        return new Set()
      }
      return new Set(itemIds)
    })
  }, [itemIds])

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true)
  }, [])

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = selectedIds.size > 0 && selectedIds.size === itemIds.size
  const hasSelection = selectedIds.size > 0
  const selectionCount = selectedIds.size

  return useMemo(
    () => ({
      selectedIds,
      selectedItems,
      isSelected,
      toggle,
      select,
      deselect,
      selectAll,
      deselectAll,
      toggleAll,
      isAllSelected,
      hasSelection,
      selectionCount,
      isSelectionMode,
      enterSelectionMode,
      exitSelectionMode,
    }),
    [
      selectedIds,
      selectedItems,
      isSelected,
      toggle,
      select,
      deselect,
      selectAll,
      deselectAll,
      toggleAll,
      isAllSelected,
      hasSelection,
      selectionCount,
      isSelectionMode,
      enterSelectionMode,
      exitSelectionMode,
    ]
  )
}
