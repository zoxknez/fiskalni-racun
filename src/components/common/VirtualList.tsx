/**
 * Virtual List Component
 *
 * Efficiently renders large lists using react-virtuoso
 *
 * @module components/common/VirtualList
 */

import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { memo, useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso, type VirtuosoProps } from 'react-virtuoso'

interface VirtualListProps<T> extends Partial<VirtuosoProps<T, unknown>> {
  items: T[]
  itemContent: (index: number, item: T) => React.ReactNode
  emptyMessage?: string
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  estimateSize?: number
  overscan?: number
}

function VirtualListComponent<T>({
  items,
  itemContent,
  emptyMessage,
  loading = false,
  onLoadMore,
  hasMore = false,
  estimateSize = 80,
  overscan = 5,
  ...virtuosoProps
}: VirtualListProps<T>) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const { components: incomingComponents, ...restVirtuosoProps } = virtuosoProps

  const resolvedEmptyMessage = emptyMessage ?? t('common.noItems', 'Nema stavki')

  const footerComponent = useMemo(
    () =>
      hasMore
        ? () => (
            <div className="flex justify-center py-4">
              <Loader2
                className={clsx(
                  'h-6 w-6 text-primary-500',
                  !prefersReducedMotion && 'animate-spin'
                )}
              />
            </div>
          )
        : undefined,
    [hasMore, prefersReducedMotion]
  )

  const components = useMemo(
    () =>
      footerComponent
        ? {
            ...incomingComponents,
            Footer: footerComponent,
          }
        : incomingComponents,
    [footerComponent, incomingComponents]
  )

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-dark-600 dark:text-dark-400">{resolvedEmptyMessage}</p>
      </div>
    )
  }

  const optionalVirtuosoProps = {
    ...(onLoadMore && hasMore ? { endReached: onLoadMore } : {}),
    ...(components ? { components } : {}),
  }

  return (
    <Virtuoso
      data={items}
      itemContent={itemContent}
      defaultItemHeight={estimateSize}
      overscan={overscan}
      {...optionalVirtuosoProps}
      {...restVirtuosoProps}
    />
  )
}

export const VirtualList = memo(VirtualListComponent) as typeof VirtualListComponent

/**
 * Virtual Grid Component
 *
 * Grid layout with virtualization
 */
interface VirtualGridProps<T> {
  items: T[]
  itemContent: (index: number, item: T) => React.ReactNode
  columns?: number
  gap?: number
  emptyMessage?: string
}

function VirtualGridComponent<T>({
  items,
  itemContent,
  columns = 2,
  gap = 16,
  emptyMessage,
}: VirtualGridProps<T>) {
  const { t } = useTranslation()
  const id = useId()

  const resolvedEmptyMessage = emptyMessage ?? t('common.noItems', 'Nema stavki')

  // Group items into rows with stable keys
  const rows = useMemo(() => {
    const rowsArray: Array<Array<{ key: string; item: T; index: number }>> = []
    for (let i = 0; i < items.length; i += columns) {
      const rowItems = items.slice(i, i + columns).map((item, colIndex) => ({
        key: `${id}-row-${Math.floor(i / columns)}-col-${colIndex}`,
        item,
        index: i + colIndex,
      }))
      rowsArray.push(rowItems)
    }
    return rowsArray
  }, [items, columns, id])

  // Memoized row renderer
  const rowRenderer = useMemo(
    () => (_rowIndex: number, row: Array<{ key: string; item: T; index: number }>) => (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
          marginBottom: `${gap}px`,
        }}
      >
        {row.map(({ key, item, index }) => (
          <div key={key}>{itemContent(index, item)}</div>
        ))}
      </div>
    ),
    [columns, gap, itemContent]
  )

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-dark-600 dark:text-dark-400">{resolvedEmptyMessage}</p>
      </div>
    )
  }

  return <Virtuoso data={rows} itemContent={rowRenderer} />
}

export const VirtualGrid = memo(VirtualGridComponent) as typeof VirtualGridComponent
