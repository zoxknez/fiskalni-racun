/**
 * Supabase Realtime Sync
 *
 * Real-time synchronization between IndexedDB and Supabase
 * Supports bi-directional sync: Web ↔ Mobile
 *
 * Features:
 * - Automatic sync when online
 * - Realtime updates from Supabase
 * - Conflict resolution (last-write-wins)
 * - Queue-based offline changes
 */

import { type Device, db, type Receipt, type SyncQueue } from '@lib/db'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { syncLogger } from './logger'
import { supabase } from './supabase'

let receiptsChannel: RealtimeChannel | null = null
let devicesChannel: RealtimeChannel | null = null

/**
 * Upload local IndexedDB data to Supabase
 */
export async function syncToSupabase(item: SyncQueue): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { entityType, entityId, operation } = item

  syncLogger.log(`Syncing ${operation} ${entityType} #${entityId} to Supabase`)

  try {
    if (entityType === 'receipt') {
      const receipt = await db.receipts.get(entityId)
      if (!receipt) {
        syncLogger.warn(`Receipt #${entityId} not found in IndexedDB`)
        return
      }

      const supabaseData = {
        id: receipt.id?.toString(),
        user_id: user.id,
        vendor: receipt.merchantName,
        pib: receipt.pib,
        date: receipt.date.toISOString(),
        total_amount: receipt.totalAmount,
        vat_amount: receipt.vatAmount,
        category: receipt.category,
        items: receipt.items,
        image_url: receipt.imageUrl,
        qr_data: receipt.qrLink,
        notes: receipt.notes,
        updated_at: receipt.updatedAt.toISOString(),
      }

      if (operation === 'create' || operation === 'update') {
        const { error } = await supabase.from('receipts').upsert(supabaseData, { onConflict: 'id' })

        if (error) throw error
      } else if (operation === 'delete') {
        const { error } = await supabase.from('receipts').delete().eq('id', entityId)

        if (error) throw error
      }
    } else if (entityType === 'device') {
      const device = await db.devices.get(entityId)
      if (!device) {
        syncLogger.warn(`Device #${entityId} not found in IndexedDB`)
        return
      }

      const supabaseData = {
        id: device.id?.toString(),
        user_id: user.id,
        receipt_id: device.receiptId?.toString(),
        brand: device.brand,
        model: device.model,
        category: device.category,
        serial_number: device.serialNumber,
        image_url: device.imageUrl,
        purchase_date: device.purchaseDate.toISOString(),
        warranty_duration: device.warrantyDuration,
        warranty_expiry: device.warrantyExpiry.toISOString(),
        warranty_terms: device.warrantyTerms,
        status: device.status,
        service_center_name: device.serviceCenterName,
        service_center_address: device.serviceCenterAddress,
        service_center_phone: device.serviceCenterPhone,
        service_center_hours: device.serviceCenterHours,
        updated_at: device.updatedAt.toISOString(),
      }

      if (operation === 'create' || operation === 'update') {
        const { error } = await supabase.from('devices').upsert(supabaseData, { onConflict: 'id' })

        if (error) throw error
      } else if (operation === 'delete') {
        const { error } = await supabase.from('devices').delete().eq('id', entityId)

        if (error) throw error
      }
    }

    syncLogger.log(`✓ Synced ${entityType} #${entityId} to Supabase`)
  } catch (error) {
    syncLogger.error(`✗ Failed to sync ${entityType} #${entityId}:`, error)
    throw error
  }
}

/**
 * Download data from Supabase to IndexedDB
 */
export async function syncFromSupabase(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    syncLogger.warn('Cannot sync from Supabase - user not authenticated')
    return
  }

  syncLogger.log('Downloading data from Supabase...')

  try {
    // Fetch receipts
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)

    if (receiptsError) throw receiptsError

    // Upsert receipts to IndexedDB
    if (receipts && receipts.length > 0) {
      for (const receipt of receipts) {
        const localReceipt: Partial<Receipt> = {
          id: Number(receipt.id),
          merchantName: receipt.vendor,
          pib: receipt.pib || '',
          date: new Date(receipt.date),
          time: new Date(receipt.date).toLocaleTimeString(),
          totalAmount: receipt.total_amount,
          vatAmount: receipt.vat_amount,
          items: receipt.items || [],
          category: receipt.category || '',
          notes: receipt.notes,
          qrLink: receipt.qr_data,
          imageUrl: receipt.image_url,
          createdAt: new Date(receipt.created_at),
          updatedAt: new Date(receipt.updated_at),
          syncStatus: 'synced',
        }

        await db.receipts.put(localReceipt as Receipt)
      }
      syncLogger.log(`✓ Synced ${receipts.length} receipts from Supabase`)
    }

    // Fetch devices
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)

    if (devicesError) throw devicesError

    // Upsert devices to IndexedDB
    if (devices && devices.length > 0) {
      for (const device of devices) {
        const localDevice: Partial<Device> = {
          id: Number(device.id),
          receiptId: device.receipt_id ? Number(device.receipt_id) : undefined,
          brand: device.brand,
          model: device.model,
          category: device.category,
          serialNumber: device.serial_number,
          imageUrl: device.image_url,
          purchaseDate: new Date(device.purchase_date),
          warrantyDuration: device.warranty_duration,
          warrantyExpiry: new Date(device.warranty_expiry),
          warrantyTerms: device.warranty_terms,
          status: device.status,
          serviceCenterName: device.service_center_name,
          serviceCenterAddress: device.service_center_address,
          serviceCenterPhone: device.service_center_phone,
          serviceCenterHours: device.service_center_hours,
          reminders: [],
          createdAt: new Date(device.created_at),
          updatedAt: new Date(device.updated_at),
          syncStatus: 'synced',
        }

        await db.devices.put(localDevice as Device)
      }
      syncLogger.log(`✓ Synced ${devices.length} devices from Supabase`)
    }
  } catch (error) {
    syncLogger.error('Failed to sync from Supabase:', error)
    throw error
  }
}

/**
 * Subscribe to Supabase Realtime updates
 * Listens for INSERT, UPDATE, DELETE from other devices
 */
export async function subscribeToRealtimeUpdates(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    syncLogger.warn('Cannot subscribe to realtime - user not authenticated')
    return
  }

  // Unsubscribe existing channels
  unsubscribeFromRealtime()

  syncLogger.log('Subscribing to Supabase Realtime...')

  // Subscribe to receipts table
  receiptsChannel = supabase
    .channel('receipts_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'receipts',
        filter: `user_id=eq.${user.id}`,
      },
      async (payload) => {
        syncLogger.log('Realtime receipt change:', payload.eventType, payload.new)

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const receipt = payload.new
          const localReceipt: Partial<Receipt> = {
            id: Number(receipt.id),
            merchantName: receipt.vendor,
            pib: receipt.pib || '',
            date: new Date(receipt.date),
            time: new Date(receipt.date).toLocaleTimeString(),
            totalAmount: receipt.total_amount,
            vatAmount: receipt.vat_amount,
            items: receipt.items,
            category: receipt.category || '',
            notes: receipt.notes,
            qrLink: receipt.qr_data,
            imageUrl: receipt.image_url,
            createdAt: new Date(receipt.created_at),
            updatedAt: new Date(receipt.updated_at),
            syncStatus: 'synced',
          }

          await db.receipts.put(localReceipt as Receipt)
          syncLogger.log(`✓ Local receipt #${receipt.id} updated from realtime`)
        } else if (payload.eventType === 'DELETE') {
          const receipt = payload.old
          await db.receipts.delete(Number(receipt.id))
          syncLogger.log(`✓ Local receipt #${receipt.id} deleted from realtime`)
        }
      }
    )
    .subscribe()

  // Subscribe to devices table
  devicesChannel = supabase
    .channel('devices_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devices',
        filter: `user_id=eq.${user.id}`,
      },
      async (payload) => {
        syncLogger.log('Realtime device change:', payload.eventType, payload.new)

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const device = payload.new
          const localDevice: Partial<Device> = {
            id: Number(device.id),
            receiptId: device.receipt_id ? Number(device.receipt_id) : undefined,
            brand: device.brand,
            model: device.model,
            category: device.category,
            serialNumber: device.serial_number,
            imageUrl: device.image_url,
            purchaseDate: new Date(device.purchase_date),
            warrantyDuration: device.warranty_duration,
            warrantyExpiry: new Date(device.warranty_expiry),
            warrantyTerms: device.warranty_terms,
            status: device.status,
            serviceCenterName: device.service_center_name,
            serviceCenterAddress: device.service_center_address,
            serviceCenterPhone: device.service_center_phone,
            serviceCenterHours: device.service_center_hours,
            reminders: [],
            createdAt: new Date(device.created_at),
            updatedAt: new Date(device.updated_at),
            syncStatus: 'synced',
          }

          await db.devices.put(localDevice as Device)
          syncLogger.log(`✓ Local device #${device.id} updated from realtime`)
        } else if (payload.eventType === 'DELETE') {
          const device = payload.old
          await db.devices.delete(Number(device.id))
          syncLogger.log(`✓ Local device #${device.id} deleted from realtime`)
        }
      }
    )
    .subscribe()

  syncLogger.log('✓ Subscribed to Supabase Realtime')
}

/**
 * Unsubscribe from Supabase Realtime
 */
export function unsubscribeFromRealtime(): void {
  if (receiptsChannel) {
    supabase.removeChannel(receiptsChannel)
    receiptsChannel = null
  }
  if (devicesChannel) {
    supabase.removeChannel(devicesChannel)
    devicesChannel = null
  }
  syncLogger.log('Unsubscribed from Supabase Realtime')
}
