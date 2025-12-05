/**
 * TanStack Query hooks for Devices
 *
 * Modern v5 features with Suspense support
 *
 * @module hooks/queries/useDevicesQuery
 */

import { addDevice, type Device, db, deleteDevice, updateDevice } from '@lib/db'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { broadcastMessage } from '@/lib/broadcast'

/**
 * Query keys factory
 */
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filters?: Partial<Device>) => [...deviceKeys.lists(), filters] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
  expiring: (days: number) => [...deviceKeys.all, 'expiring', days] as const,
}

/**
 * Fetch all devices
 */
async function fetchDevices(): Promise<Device[]> {
  return await db.devices.orderBy('warrantyExpiry').toArray()
}

/**
 * Fetch single device
 */
async function fetchDevice(id: string): Promise<Device | undefined> {
  return await db.devices.get(id)
}

/**
 * Fetch expiring devices
 */
async function fetchExpiringDevices(days: number): Promise<Device[]> {
  const now = new Date()
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  return await db.devices
    .where('[status+warrantyExpiry]')
    .between(['active', now], ['active', threshold], true, true)
    .toArray()
}

/**
 * ⭐ Suspense query - All devices
 */
export function useDevicesSuspense() {
  return useSuspenseQuery({
    queryKey: deviceKeys.lists(),
    queryFn: fetchDevices,
  })
}

/**
 * Regular query - All devices
 */
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.lists(),
    queryFn: fetchDevices,
  })
}

/**
 * ⭐ Suspense query - Single device
 */
export function useDeviceSuspense(id: string) {
  return useSuspenseQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => fetchDevice(id),
  })
}

/**
 * Query - Expiring devices
 */
export function useExpiringDevices(days = 30) {
  return useQuery({
    queryKey: deviceKeys.expiring(days),
    queryFn: () => fetchExpiringDevices(days),
  })
}

/**
 * ⭐ Optimistic mutation - Add device
 */
export function useAddDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (device: Parameters<typeof addDevice>[0]) => {
      const deviceId = await addDevice(device)
      return deviceId
    },

    onMutate: async (newDevice) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.lists() })

      const previousDevices = queryClient.getQueryData<Device[]>(deviceKeys.lists())

      // Optimistically add device
      queryClient.setQueryData<Device[]>(deviceKeys.lists(), (old) => {
        const optimisticDevice: Device = {
          id: crypto.randomUUID(),
          ...newDevice,
          warrantyExpiry: new Date(
            newDevice.purchaseDate.getTime() + newDevice.warrantyDuration * 30 * 24 * 60 * 60 * 1000
          ),
          status: 'active',
          reminders: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
        } as Device

        return [...(old || []), optimisticDevice]
      })

      return { previousDevices }
    },

    onError: (_err, _newDevice, context) => {
      queryClient.setQueryData(deviceKeys.lists(), context?.previousDevices)
    },

    onSuccess: (deviceId) => {
      if (deviceId) {
        broadcastMessage({ type: 'device-created', deviceId })
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: deviceKeys.expiring(30) })
    },
  })
}

/**
 * ⭐ Optimistic mutation - Update device
 */
export function useUpdateDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      reminderDays,
    }: {
      id: string
      updates: Partial<Device>
      reminderDays?: number[]
    }) => {
      await updateDevice(id, updates, reminderDays)
      return id
    },

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.detail(id) })

      const previous = queryClient.getQueryData<Device>(deviceKeys.detail(id))

      queryClient.setQueryData<Device>(deviceKeys.detail(id), (old) => {
        if (!old) return old
        return { ...old, ...updates }
      })

      return { previous }
    },

    onError: (_err, { id }, context) => {
      queryClient.setQueryData(deviceKeys.detail(id), context?.previous)
    },

    onSuccess: (_data, { id }) => {
      broadcastMessage({ type: 'device-updated', deviceId: id })
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: deviceKeys.expiring(30) })
    },
  })
}

/**
 * ⭐ Optimistic mutation - Delete device
 */
export function useDeleteDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDevice(id)
      return id
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.lists() })

      const previousDevices = queryClient.getQueryData<Device[]>(deviceKeys.lists())

      queryClient.setQueryData<Device[]>(deviceKeys.lists(), (old) => {
        return old?.filter((d) => d.id !== id) || []
      })

      return { previousDevices }
    },

    onError: (_err, _id, context) => {
      queryClient.setQueryData(deviceKeys.lists(), context?.previousDevices)
    },

    onSuccess: (_data, id) => {
      broadcastMessage({ type: 'device-deleted', deviceId: id })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: deviceKeys.expiring(30) })
    },
  })
}
