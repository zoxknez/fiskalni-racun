/**
 * Add to Calendar Button
 *
 * Button with dropdown to add warranty expiration to different calendar apps
 */

import { track } from '@lib/analytics'
import type { Device } from '@lib/db'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { addToCalendar, type CalendarType } from '@/services/calendarService'

interface AddToCalendarButtonProps {
  device: Device
  className?: string
}

const calendarOptions: {
  type: CalendarType
  label: string
  icon: string
  useTranslation?: boolean
}[] = [
  { type: 'google', label: 'Google Calendar', icon: '📅' },
  { type: 'outlook', label: 'Outlook', icon: '📧' },
  { type: 'apple', label: 'Apple Calendar / iCal', icon: '🍎' },
  { type: 'other', label: 'otherDownloadICS', icon: '📥', useTranslation: true },
]

export const AddToCalendarButton = memo(({ device, className = '' }: AddToCalendarButtonProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (type: CalendarType) => {
    try {
      addToCalendar(device, type)
      track('calendar_add', { deviceId: device.id, type })
      toast.success(t('calendar.addedSuccess'))
    } catch {
      toast.error(t('calendar.addedError'))
    }
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-medium text-white shadow-amber-500/30 shadow-lg transition-colors hover:bg-amber-600"
      >
        <Calendar className="h-5 w-5" />
        <span>{t('calendar.addToCalendar')}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-dark-200 bg-white p-2 shadow-xl dark:border-dark-700 dark:bg-dark-800"
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-dark-500 text-sm dark:text-dark-400">
                {t('calendar.selectCalendar')}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-dark-400 transition-colors hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {calendarOptions.map((option) => (
                <motion.button
                  key={option.type}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(option.type)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-dark-100 dark:hover:bg-dark-700"
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-medium text-dark-700 dark:text-dark-200">
                    {option.useTranslation ? t('calendar.otherDownloadICS') : option.label}
                  </span>
                </motion.button>
              ))}
            </div>

            <div className="mt-2 border-dark-100 border-t px-2 pt-2 dark:border-dark-700">
              <p className="text-center text-dark-400 text-xs dark:text-dark-500">
                {t('calendar.reminderNote')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

AddToCalendarButton.displayName = 'AddToCalendarButton'

export default AddToCalendarButton
