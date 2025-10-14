import { useState, useMemo } from 'react'
import type { Device } from '@/types'

export type DeviceFilterType = 'all' | 'active' | 'expired' | 'in-service'

export interface DeviceFiltersResult {
  filter: DeviceFilterType
  setFilter: (filter: DeviceFilterType) => void
  filteredDevices: Device[]
  filterCount: (type: DeviceFilterType) => number
}

/**
 * Manage device filtering with memoized results
 * Supports multiple filter types with efficient counting
 */
export function useDeviceFilters(devices: Device[] | undefined): DeviceFiltersResult {
  const [filter, setFilter] = useState<DeviceFilterType>('all')

  // Memoize filtered devices
  const filteredDevices = useMemo(() => {
    if (!devices) return []
    
    if (filter === 'all') return devices
    
    return devices.filter((device) => device.status === filter)
  }, [devices, filter])

  // Memoize filter counts
  const filterCount = useMemo(() => {
    if (!devices) {
      return () => 0
    }

    const counts: Record<DeviceFilterType, number> = {
      all: devices.length,
      active: devices.filter(d => d.status === 'active').length,
      expired: devices.filter(d => d.status === 'expired').length,
      'in-service': devices.filter(d => d.status === 'in-service').length,
    }

    return (type: DeviceFilterType) => counts[type]
  }, [devices])

  return {
    filter,
    setFilter,
    filteredDevices,
    filterCount,
  }
}
