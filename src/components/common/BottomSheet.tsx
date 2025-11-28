/**
 * Bottom Sheet Component
 *
 * Modern bottom sheet using Vaul drawer
 * Mobile-first design with smooth animations
 *
 * @module components/common/BottomSheet
 */

import { cn } from '@lib/utils'
import { memo, type ReactNode, useCallback } from 'react'
import { Drawer } from 'vaul'
import { haptics } from '@/lib/haptics'

interface BottomSheetProps {
  /** Open state */
  open: boolean
  /** Called when open state changes */
  onOpenChange: (open: boolean) => void
  /** Sheet title */
  title?: string
  /** Sheet description */
  description?: string
  /** Sheet content */
  children: ReactNode
  /** Trigger element (button/link that opens sheet) */
  trigger?: ReactNode
  /** Custom className for content */
  className?: string
  /** Disable haptic feedback */
  disableHaptics?: boolean
}

function BottomSheetComponent({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className,
  disableHaptics = false,
}: BottomSheetProps) {
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!disableHaptics) {
        if (newOpen) {
          haptics.light()
        } else {
          haptics.selection()
        }
      }
      onOpenChange(newOpen)
    },
    [disableHaptics, onOpenChange]
  )

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className={cn(
            'fixed right-0 bottom-0 left-0 z-50 mt-24 flex max-h-[85vh] flex-col rounded-t-[10px] bg-white dark:bg-dark-800',
            className
          )}
        >
          {/* Handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />

          {/* Header */}
          {(title || description) && (
            <div className="border-gray-200 border-b p-4 dark:border-gray-700">
              {title && (
                <Drawer.Title className="mb-1 font-semibold text-gray-900 text-lg dark:text-white">
                  {title}
                </Drawer.Title>
              )}
              {description && (
                <Drawer.Description className="text-gray-600 text-sm dark:text-gray-400">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export const BottomSheet = memo(BottomSheetComponent)

/**
 * Bottom Sheet Filter Component
 * Pre-built filter sheet with common patterns
 */
interface FilterOption {
  id: string
  label: string
  value: string | number
  count?: number
}

interface BottomSheetFilterProps {
  /** Open state */
  open: boolean
  /** Called when open state changes */
  onOpenChange: (open: boolean) => void
  /** Filter title */
  title: string
  /** Available options */
  options: FilterOption[]
  /** Currently selected value */
  value: string | number | null
  /** Called when option is selected */
  onSelect: (value: string | number) => void
  /** Trigger element */
  trigger?: ReactNode
}

export function BottomSheetFilter({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
  trigger,
}: BottomSheetFilterProps) {
  const handleSelect = useCallback(
    (optionValue: string | number) => {
      haptics.selection()
      onSelect(optionValue)
      onOpenChange(false)
    },
    [onSelect, onOpenChange]
  )

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} trigger={trigger}>
      <div className="space-y-1">
        {options.map((option) => {
          const isSelected = value === option.value

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'touch-target flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors',
                isSelected
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <span className="font-medium">{option.label}</span>
              <div className="flex items-center gap-2">
                {option.count !== undefined && (
                  <span className="text-gray-500 text-sm dark:text-gray-400">{option.count}</span>
                )}
                {isSelected && (
                  <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
