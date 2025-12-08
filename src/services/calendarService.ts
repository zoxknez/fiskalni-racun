/**
 * Calendar Service
 *
 * Integrates with Google Calendar and other calendar apps
 * to add warranty expiration reminders
 */

import type { Device } from '@lib/db'
import { format } from 'date-fns'
import i18n from '@/i18n'
import { logger } from '@/lib/logger'

// Types
export interface CalendarEvent {
  title: string
  description: string
  startDate: Date
  endDate: Date
  location?: string
  reminder?: number // minutes before
}

/**
 * Generate calendar event data for a warranty
 */
export function generateWarrantyEvent(device: Device): CalendarEvent {
  const expiryDate = new Date(device.warrantyExpiry)
  const t = i18n.t.bind(i18n)

  const descriptionParts = [
    t('calendar.warrantyDescription', { device: `${device.brand} ${device.model}` }),
    '',
    `${t('warrantyDetail.category')}: ${device.category}`,
  ]

  if (device.serialNumber) {
    descriptionParts.push(`${t('warrantyDetail.serialNumber')}: ${device.serialNumber}`)
  }

  if (device.serviceCenterName) {
    descriptionParts.push('')
    descriptionParts.push(`${t('warrantyDetail.authorizedService')}: ${device.serviceCenterName}`)
    if (device.serviceCenterPhone) {
      descriptionParts.push(`${t('warrantyDetail.servicePhone')}: ${device.serviceCenterPhone}`)
    }
    if (device.serviceCenterAddress) {
      descriptionParts.push(`${t('warrantyDetail.serviceAddress')}: ${device.serviceCenterAddress}`)
    }
  }

  descriptionParts.push('')
  descriptionParts.push('— Fiskalni Račun App')

  const result: CalendarEvent = {
    title: `⚠️ ${t('calendar.warrantyExpiry')}: ${device.brand} ${device.model}`,
    description: descriptionParts.join('\n'),
    startDate: expiryDate,
    endDate: expiryDate,
    reminder: 24 * 60, // 1 day before
  }

  if (device.serviceCenterAddress) {
    result.location = device.serviceCenterAddress
  }

  return result
}

/**
 * Format date for ICS file
 */
function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'")
}

/**
 * Format date for Google Calendar URL
 */
function formatGoogleDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'")
}

/**
 * Generate ICS file content for calendar event
 */
export function generateICSContent(event: CalendarEvent): string {
  const uid = `warranty-${Date.now()}@fiskalni-racun`
  const now = new Date()

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fiskalni Račun//Calendar//SR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART;VALUE=DATE:${format(event.startDate, 'yyyyMMdd')}`,
    `DTEND;VALUE=DATE:${format(event.endDate, 'yyyyMMdd')}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
  ]

  if (event.location) {
    lines.push(`LOCATION:${event.location}`)
  }

  if (event.reminder) {
    lines.push('BEGIN:VALARM')
    lines.push('TRIGGER:-P1D')
    lines.push('ACTION:DISPLAY')
    lines.push(`DESCRIPTION:${event.title}`)
    lines.push('END:VALARM')
  }

  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Generate Google Calendar URL for event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render'

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    details: event.description,
  })

  if (event.location) {
    params.set('location', event.location)
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * Generate Outlook Calendar URL for event
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://outlook.live.com/calendar/action/compose'

  const params = new URLSearchParams({
    rru: 'addevent',
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description,
  })

  if (event.location) {
    params.set('location', event.location)
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEvent, filename: string): void {
  try {
    const content = generateICSContent(event)
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    logger.info('ICS file downloaded', { filename })
  } catch (error) {
    logger.error('Failed to download ICS file', error)
    throw error
  }
}

/**
 * Add warranty reminder to calendar
 * Opens a modal/menu for user to select calendar type
 */
export function addToGoogleCalendar(device: Device): void {
  const event = generateWarrantyEvent(device)
  const url = generateGoogleCalendarUrl(event)
  window.open(url, '_blank')
  logger.info('Opened Google Calendar', { deviceId: device.id })
}

/**
 * Add warranty reminder to Outlook
 */
export function addToOutlookCalendar(device: Device): void {
  const event = generateWarrantyEvent(device)
  const url = generateOutlookCalendarUrl(event)
  window.open(url, '_blank')
  logger.info('Opened Outlook Calendar', { deviceId: device.id })
}

/**
 * Add warranty reminder by downloading ICS file
 */
export function addToAppleCalendar(device: Device): void {
  const event = generateWarrantyEvent(device)
  const filename = `garancija-${device.brand}-${device.model}`.toLowerCase().replace(/\s+/g, '-')
  downloadICSFile(event, filename)
  logger.info('Downloaded ICS file for Apple Calendar', { deviceId: device.id })
}

/**
 * Check if calendar sharing is supported
 */
export function isCalendarSupported(): boolean {
  return true // Web URLs and file downloads work everywhere
}

export type CalendarType = 'google' | 'outlook' | 'apple' | 'other'

/**
 * Add to calendar based on type
 */
export function addToCalendar(device: Device, type: CalendarType): void {
  switch (type) {
    case 'google':
      addToGoogleCalendar(device)
      break
    case 'outlook':
      addToOutlookCalendar(device)
      break
    default:
      addToAppleCalendar(device)
      break
  }
}
