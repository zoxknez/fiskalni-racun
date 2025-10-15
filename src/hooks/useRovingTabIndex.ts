/**
 * Roving Tab Index for keyboard navigation in lists
 *
 * Implements ARIA authoring practices for composite widgets
 *
 * @module hooks/useRovingTabIndex
 */

import { useCallback, useState } from 'react'

/**
 * Roving tab index for keyboard navigation
 *
 * @param length - Number of items in the list
 * @returns Active index and keyboard handler
 *
 * @example
 * ```tsx
 * function List({ items }) {
 *   const { activeIndex, handleKeyDown } = useRovingTabIndex(items.length)
 *
 *   return (
 *     <div role="listbox">
 *       {items.map((item, index) => (
 *         <div
 *           key={item.id}
 *           role="option"
 *           tabIndex={index === activeIndex ? 0 : -1}
 *           onKeyDown={(e) => handleKeyDown(e.nativeEvent, index)}
 *         >
 *           {item.name}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useRovingTabIndex(length: number) {
  const [activeIndex, setActiveIndex] = useState(0)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, currentIndex: number) => {
      switch (event.key) {
        case 'ArrowDown':
        case 'Down': {
          event.preventDefault()
          const nextIndex = (currentIndex + 1) % length
          setActiveIndex(nextIndex)

          // Focus next element
          const nextElement = document.querySelector(
            `[data-roving-index="${nextIndex}"]`
          ) as HTMLElement
          nextElement?.focus()
          break
        }

        case 'ArrowUp':
        case 'Up': {
          event.preventDefault()
          const prevIndex = (currentIndex - 1 + length) % length
          setActiveIndex(prevIndex)

          // Focus previous element
          const prevElement = document.querySelector(
            `[data-roving-index="${prevIndex}"]`
          ) as HTMLElement
          prevElement?.focus()
          break
        }

        case 'Home': {
          event.preventDefault()
          setActiveIndex(0)

          const firstElement = document.querySelector('[data-roving-index="0"]') as HTMLElement
          firstElement?.focus()
          break
        }

        case 'End': {
          event.preventDefault()
          const lastIndex = length - 1
          setActiveIndex(lastIndex)

          const lastElement = document.querySelector(
            `[data-roving-index="${lastIndex}"]`
          ) as HTMLElement
          lastElement?.focus()
          break
        }

        case 'Enter':
        case ' ': {
          // Let the click handler handle this
          event.preventDefault()
          const currentElement = document.querySelector(
            `[data-roving-index="${currentIndex}"]`
          ) as HTMLElement
          currentElement?.click()
          break
        }
      }
    },
    [length]
  )

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  }
}
