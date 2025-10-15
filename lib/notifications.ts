import { track } from './analytics'
import type { Device } from './db'

export type ReminderChannel = 'push' | 'email'

export type ReminderMessage = {
  deviceId: number
  title: string
  body: string
  deepLink: string
  scheduledAt: Date
  channels: ReminderChannel[]
}

const scheduled: ReminderMessage[] = []

export function scheduleWarrantyReminders(device: Device) {
  if (!device.id || !device.warrantyExpiry) return

  const deviceId = device.id

  cancelDeviceReminders(deviceId)

  const checkpoints = [30, 7, 1]
  const messages: ReminderMessage[] = checkpoints
    .map((days) => {
      const scheduledAt = new Date(device.warrantyExpiry)
      scheduledAt.setDate(scheduledAt.getDate() - days)
      if (scheduledAt < new Date()) return null
      return {
        deviceId,
        title: `Garancija za ${device.brand} ${device.model} ističe uskoro`,
        body: `Garancija ističe za ${days} dana. Sačuvaj račun i kontakt servisne podrške.`,
        deepLink: `/warranties/${deviceId}`,
        scheduledAt,
        channels: ['push', 'email'],
      } satisfies ReminderMessage
    })
    .filter(Boolean) as ReminderMessage[]

  scheduled.push(...messages)

  for (const msg of messages) {
    track('warranty_reminder_sent', {
      deviceId: msg.deviceId,
      daysBefore: Math.round(
        (device.warrantyExpiry.getTime() - msg.scheduledAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    })
  }
}

export function cancelDeviceReminders(deviceId: number) {
  for (let i = scheduled.length - 1; i >= 0; i -= 1) {
    if (scheduled[i].deviceId === deviceId) {
      scheduled.splice(i, 1)
    }
  }
}

export function listScheduledReminders() {
  return [...scheduled]
}
