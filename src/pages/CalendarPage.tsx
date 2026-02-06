/**
 * CalendarPage
 *
 * Visual calendar view of all receipts, warranties, documents, and bills.
 * Shows when items expire, due dates, and purchase history.
 */

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  Receipt,
  Shield,
  Zap,
} from 'lucide-react'
import { memo, useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { Button } from '@/components/ui/button'
import { useDevices, useDocuments, useHouseholdBills, useReceipts } from '@/hooks/useDatabase'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type EventType = 'receipt' | 'warranty_expiry' | 'document_expiry' | 'bill_due'

interface CalendarEvent {
  id: string
  type: EventType
  title: string
  date: Date
  link: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  amount?: number
}

const EVENT_CONFIG: Record<
  EventType,
  { icon: typeof Receipt; bgClass: string; textClass: string; labelKey: string }
> = {
  receipt: {
    icon: Receipt,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    labelKey: 'calendar.eventReceipt',
  },
  warranty_expiry: {
    icon: Shield,
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-600 dark:text-orange-400',
    labelKey: 'calendar.eventWarrantyExpiry',
  },
  document_expiry: {
    icon: FileText,
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-600 dark:text-purple-400',
    labelKey: 'calendar.eventDocumentExpiry',
  },
  bill_due: {
    icon: Zap,
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-600 dark:text-yellow-400',
    labelKey: 'calendar.eventBillDue',
  },
}

// ────────────────────────────────────────────────────────────────────────────
// Day Cell Component
// ────────────────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: Date
  currentMonth: Date
  events: CalendarEvent[]
  onSelectDay: (date: Date) => void
  isSelected: boolean
}

const DayCell = memo(function DayCell({
  date,
  currentMonth,
  events,
  onSelectDay,
  isSelected,
}: DayCellProps) {
  const { t } = useTranslation()
  const isCurrentMonth = isSameMonth(date, currentMonth)
  const isCurrentDay = isToday(date)
  const hasEvents = events.length > 0

  const handleClick = useCallback(() => {
    onSelectDay(date)
  }, [date, onSelectDay])

  // Group events by type for dots
  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.type))
    return Array.from(types)
  }, [events])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative flex min-h-[60px] flex-col items-center justify-start rounded-lg p-1 text-center transition-all duration-200 sm:min-h-[80px] sm:p-2 ${!isCurrentMonth ? 'opacity-40' : ''}
        ${isSelected ? 'bg-primary-100 ring-2 ring-primary-500 dark:bg-primary-900/30' : 'hover:bg-dark-100 dark:hover:bg-dark-800'}
        ${isCurrentDay ? 'font-bold' : ''}
      `}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm sm:text-base ${isCurrentDay ? 'bg-primary-600 text-white' : 'text-dark-900 dark:text-dark-100'}
        `}
      >
        {format(date, 'd')}
      </span>

      {/* Event dots */}
      {hasEvents && (
        <div className="mt-1 flex max-w-full flex-wrap justify-center gap-0.5">
          {eventTypes.slice(0, 3).map((type) => {
            const config = EVENT_CONFIG[type]
            return (
              <span
                key={type}
                className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${config.bgClass}`}
                title={t(config.labelKey as never)}
              />
            )
          })}
          {eventTypes.length > 3 && (
            <span className="text-[8px] text-dark-500">+{eventTypes.length - 3}</span>
          )}
        </div>
      )}

      {/* Event count badge */}
      {events.length > 0 && (
        <span className="-top-1 -right-1 absolute flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 font-medium text-[10px] text-white sm:h-5 sm:w-5 sm:text-xs">
          {events.length > 9 ? '9+' : events.length}
        </span>
      )}
    </button>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Event List Component
// ────────────────────────────────────────────────────────────────────────────

interface EventListProps {
  date: Date
  events: CalendarEvent[]
}

const EventList = memo(function EventList({ date, events }: EventListProps) {
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const locale = i18n.language === 'sr' ? sr : enUS

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-dark-500 dark:text-dark-400">
        <CalendarIcon className="mx-auto mb-3 h-12 w-12 opacity-30" />
        <p>{t('calendar.noEvents')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="mb-3 font-semibold text-dark-900 dark:text-dark-100">
        {format(date, 'EEEE, d. MMMM yyyy', { locale })}
      </h3>

      {events.map((event, index) => {
        const config = EVENT_CONFIG[event.type]
        const Icon = config.icon

        return (
          <motion.div
            key={event.id}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={event.link}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:scale-[1.01] hover:shadow-md ${config.bgClass} border-transparent`}
            >
              <div
                className={
                  'flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-dark-800'
                }
              >
                <Icon className={`h-5 w-5 ${config.textClass}`} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-dark-900 dark:text-dark-100">
                  {event.title}
                </p>
                <p className={`text-sm ${config.textClass}`}>{t(config.labelKey as never)}</p>
              </div>

              {event.amount !== undefined && (
                <span className="font-semibold text-dark-900 dark:text-dark-100">
                  {event.amount.toLocaleString(i18n.language === 'en' ? 'en-US' : 'sr-RS')} RSD
                </span>
              )}
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

function CalendarPage() {
  const { t, i18n } = useTranslation()
  const headingId = useId()
  const prefersReducedMotion = useReducedMotion()
  const locale = i18n.language === 'sr' ? sr : enUS

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Data hooks
  const receipts = useReceipts()
  const devices = useDevices()
  const documents = useDocuments()
  const householdBills = useHouseholdBills()

  // Generate all events
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = []

    // Receipt purchase dates
    if (receipts) {
      for (const receipt of receipts) {
        if (!receipt.id || !receipt.date) continue
        events.push({
          id: `receipt-${receipt.id}`,
          type: 'receipt',
          title: receipt.merchantName,
          date: new Date(receipt.date),
          link: `/receipts/${receipt.id}`,
          amount: receipt.totalAmount,
        })
      }
    }

    // Warranty expiry dates
    if (devices) {
      for (const device of devices) {
        if (!device.id || !device.warrantyExpiry) continue
        events.push({
          id: `warranty-${device.id}`,
          type: 'warranty_expiry',
          title: `${device.brand} ${device.model}`,
          date: new Date(device.warrantyExpiry),
          link: `/warranties/${device.id}`,
        })
      }
    }

    // Document expiry dates
    if (documents) {
      for (const doc of documents) {
        if (!doc.id || !doc.expiryDate) continue
        events.push({
          id: `document-${doc.id}`,
          type: 'document_expiry',
          title: doc.name,
          date: new Date(doc.expiryDate),
          link: '/documents',
        })
      }
    }

    // Bill due dates
    if (householdBills) {
      for (const bill of householdBills) {
        if (!bill.id || !bill.dueDate) continue
        events.push({
          id: `bill-${bill.id}`,
          type: 'bill_due',
          title: bill.provider,
          date: new Date(bill.dueDate),
          link: '/analytics',
          amount: bill.amount,
        })
      }
    }

    return events
  }, [receipts, devices, documents, householdBills])

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      return allEvents.filter((event) => isSameDay(event.date, date))
    },
    [allEvents]
  )

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  // Navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }, [])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }, [])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selectedDate)
  }, [selectedDate, getEventsForDate])

  // Stats for current month
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    const monthEvents = allEvents.filter((e) => e.date >= monthStart && e.date <= monthEnd)

    return {
      total: monthEvents.length,
      receipts: monthEvents.filter((e) => e.type === 'receipt').length,
      warranties: monthEvents.filter((e) => e.type === 'warranty_expiry').length,
      documents: monthEvents.filter((e) => e.type === 'document_expiry').length,
      bills: monthEvents.filter((e) => e.type === 'bill_due').length,
    }
  }, [allEvents, currentMonth])

  const weekDays = useMemo(() => {
    return [
      t('calendar.dayMon'),
      t('calendar.dayTue'),
      t('calendar.dayWed'),
      t('calendar.dayThu'),
      t('calendar.dayFri'),
      t('calendar.daySat'),
      t('calendar.daySun'),
    ]
  }, [t])

  return (
    <PageTransition>
      <div className="space-y-6 pb-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-6 text-white shadow-2xl sm:p-8"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
                backgroundSize: '100px 100px',
              }}
            />
          </div>

          {/* Floating Orbs */}
          {!prefersReducedMotion && (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                className="-top-20 -right-20 absolute h-64 w-64 rounded-full bg-white/20 blur-2xl"
              />
              <motion.div
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                className="-bottom-20 -left-20 absolute h-48 w-48 rounded-full bg-indigo-300/20 blur-2xl"
              />
            </>
          )}

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 id={headingId} className="font-bold text-2xl sm:text-3xl">
                  {t('calendar.title')}
                </h1>
                <p className="text-sm text-white/80">{t('calendar.subtitle')}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-xl bg-white/15 p-3 text-center backdrop-blur-sm">
                <Receipt className="mx-auto mb-1 h-5 w-5" />
                <div className="font-bold text-xl">{monthStats.receipts}</div>
                <div className="text-[10px] text-white/70 sm:text-xs">{t('calendar.receipts')}</div>
              </div>
              <div className="rounded-xl bg-white/15 p-3 text-center backdrop-blur-sm">
                <Shield className="mx-auto mb-1 h-5 w-5" />
                <div className="font-bold text-xl">{monthStats.warranties}</div>
                <div className="text-[10px] text-white/70 sm:text-xs">
                  {t('calendar.warranties')}
                </div>
              </div>
              <div className="rounded-xl bg-white/15 p-3 text-center backdrop-blur-sm">
                <FileText className="mx-auto mb-1 h-5 w-5" />
                <div className="font-bold text-xl">{monthStats.documents}</div>
                <div className="text-[10px] text-white/70 sm:text-xs">
                  {t('calendar.documents')}
                </div>
              </div>
              <div className="rounded-xl bg-white/15 p-3 text-center backdrop-blur-sm">
                <Zap className="mx-auto mb-1 h-5 w-5" />
                <div className="font-bold text-xl">{monthStats.bills}</div>
                <div className="text-[10px] text-white/70 sm:text-xs">{t('calendar.bills')}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Calendar Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between rounded-2xl border border-dark-200 bg-white p-3 shadow-sm dark:border-dark-700 dark:bg-dark-800"
        >
          <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="rounded-xl">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-dark-900 text-lg dark:text-dark-100">
              {format(currentMonth, 'MMMM yyyy', { locale })}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToToday} className="rounded-xl">
              {t('calendar.today')}
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={goToNextMonth} className="rounded-xl">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-dark-200 bg-white p-2 shadow-sm sm:p-4 dark:border-dark-700 dark:bg-dark-800"
        >
          {/* Week day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 text-center font-medium text-dark-500 text-xs sm:text-sm"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => (
              <DayCell
                key={day.toISOString()}
                date={day}
                currentMonth={currentMonth}
                events={getEventsForDate(day)}
                onSelectDay={setSelectedDate}
                isSelected={isSameDay(day, selectedDate)}
              />
            ))}
          </div>
        </motion.div>

        {/* Selected Day Events */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-dark-200 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800"
        >
          <EventList date={selectedDate} events={selectedDateEvents} />
        </motion.div>
      </div>
    </PageTransition>
  )
}

export default memo(CalendarPage)
