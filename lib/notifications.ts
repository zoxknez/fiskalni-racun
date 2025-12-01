import { track } from './analytics'
import type { Device } from './db'

export type WarrantyReminderDevice = Pick<Device, 'id' | 'brand' | 'model' | 'warrantyExpiry'> &
  Partial<Device>

export type ReminderChannel = 'push' | 'email'

export type ReminderMessage = {
  deviceId: string
  title: string
  body: string
  deepLink: string
  scheduledAt: Date
  channels: ReminderChannel[]
}

const scheduled: ReminderMessage[] = []

export function scheduleWarrantyReminders(device: WarrantyReminderDevice, reminderDays?: number[]) {
  if (!device.id || !device.warrantyExpiry) return

  const deviceId = device.id

  cancelDeviceReminders(deviceId)

  // Use custom reminder days or default to [30, 7, 1]
  const checkpoints = reminderDays && reminderDays.length > 0 ? reminderDays : [30, 7, 1]
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

export function cancelDeviceReminders(deviceId: string) {
  for (let i = scheduled.length - 1; i >= 0; i -= 1) {
    const reminder = scheduled[i]
    if (reminder && reminder.deviceId === deviceId) {
      scheduled.splice(i, 1)
    }
  }
}

export function listScheduledReminders() {
  return [...scheduled]
}
