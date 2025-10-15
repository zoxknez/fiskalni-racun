import { useEffect } from 'react'

/**
 * Modern Keyboard Shortcuts Hook
 *
 * Global keyboard shortcut handler
 * Supports modifier keys (Ctrl, Alt, Shift, Meta)
 */

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean // Cmd on Mac, Win on Windows
  callback: (event: KeyboardEvent) => void
  preventDefault?: boolean
}

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matches =
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl) &&
          (shortcut.alt === undefined || event.altKey === shortcut.alt) &&
          (shortcut.shift === undefined || event.shiftKey === shortcut.shift) &&
          (shortcut.meta === undefined || event.metaKey === shortcut.meta)

        if (matches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.callback(event)
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

/**
 * Hook for single key press
 */
export function useKey(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: Omit<KeyboardShortcut, 'key' | 'callback'> = {}
) {
  useKeyboard([{ key, callback, ...options }])
}

/**
 * Escape key handler
 */
export function useEscapeKey(callback: () => void) {
  useKey('Escape', callback)
}

/**
 * Enter key handler
 */
export function useEnterKey(callback: () => void) {
  useKey('Enter', callback)
}

// Example usage:
/*
// In component:
useKeyboard([
  { key: 'k', ctrl: true, callback: () => openCommandPalette() },
  { key: 's', ctrl: true, callback: () => saveForm() },
  { key: 'Escape', callback: () => closeModal() },
])

// Or simple:
useEscapeKey(() => setOpen(false))
*/
