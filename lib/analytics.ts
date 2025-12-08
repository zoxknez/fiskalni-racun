type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_complete'
  | 'receipt_add_qr_start'
  | 'receipt_add_qr_success'
  | 'receipt_add_qr_fail'
  | 'receipt_add_photo_start'
  | 'receipt_add_photo_success'
  | 'receipt_add_photo_fail'
  | 'receipt_add_manual_success'
  | 'household_bill_add_manual_success'
  | 'receipt_view'
  | 'receipt_edit'
  | 'receipt_delete'
  | 'receipt_shared'
  | 'warranty_shared'
  | 'calendar_add'
  | 'backup_download'
  | 'backup_restore'
  | 'device_create_from_receipt_start'
  | 'device_create_from_receipt_success'
  | 'device_create_from_receipt_fail'
  | 'warranty_reminder_sent'
  | 'warranty_reminder_opened'
  | 'search_used'
  | 'filter_applied'
  | 'settings_updated'
  | 'push_subscription_success'
  | 'push_subscription_error'
  | 'push_subscription_synced'
  | 'push_permission_denied'
  | 'push_test_sent'
  | 'push_test_error'

interface AnalyticsPayload {
  event: AnalyticsEvent
  timestamp: number
  userId?: string
  properties?: Record<string, unknown>
}

const queue: AnalyticsPayload[] = []
const listeners = new Set<(payload: AnalyticsPayload) => void>()

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  const payload: AnalyticsPayload = {
    event,
    timestamp: Date.now(),
  }

  if (properties) {
    payload.properties = properties
  }
  queue.push(payload)
  for (const listener of listeners) {
    listener(payload)
  }

  if (queue.length > 200) {
    queue.shift()
  }
}

export function getBufferedEvents() {
  return [...queue]
}

export function onTrack(listener: (payload: AnalyticsPayload) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
