// AddReceiptPage - Refactored Modular Version
// ──────────────────────────────────────────────────────────────────────────────
// This is a refactored version of AddReceiptPageSimplified
// Split into smaller, maintainable components
// ──────────────────────────────────────────────────────────────────────────────

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { useHaptic } from '@/hooks/useHaptic'
import { useToast } from '@/hooks/useToast'
import { logger } from '@/lib/logger'
import { FiscalReceiptForm, HouseholdBillForm, ReceiptTypeSelector } from './components'
import type { ReceiptType } from './types'

function AddReceiptPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const { impactLight, notificationSuccess, notificationError } = useHaptic()

  // Type selection from URL
  const initialType = useMemo(
    () => (searchParams.get('type') as ReceiptType) || null,
    [searchParams]
  )
  const [receiptType, setReceiptType] = useState<ReceiptType>(initialType)
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  // Handle type selection
  const selectType = useCallback(
    (type: 'fiscal' | 'household') => {
      setReceiptType(type)
      setSearchParams({ type }, { replace: true })
      impactLight()
    },
    [setSearchParams, impactLight]
  )

  // Handle back to type selection
  const handleBack = useCallback(() => {
    setReceiptType(null)
    setSearchParams({}, { replace: true })
    impactLight()
  }, [setSearchParams, impactLight])

  // Handle Web Share Target payload
  useEffect(() => {
    const source = searchParams.get('source')
    if (source !== 'share-target') return

    // Default to fiscal form for shared receipts
    setReceiptType('fiscal')

    const fileKey = searchParams.get('file')

    // Load shared file from cache if present
    const loadFileFromCache = async () => {
      if (!fileKey) return
      if (!('caches' in window)) return
      try {
        const cache = await caches.open('shared-media')
        const res = await cache.match(fileKey)
        if (!res) return
        const blob = await res.blob()

        if (blob.type && !blob.type.startsWith('image/')) {
          setShareNotice(
            t('addReceipt.sharedSavedAsNote', {
              defaultValue: 'Deljeni fajl je dodat u napomenu (pregled nije moguć).',
            })
          )
          return
        }

        const notice = t('addReceipt.sharedLoaded', { defaultValue: 'Deljeni sadržaj je učitan.' })
        setShareNotice(notice)
        toast.success(notice)
        notificationSuccess()
      } catch (error) {
        logger.error('[ShareTarget] Failed to load shared file', error)
        notificationError()
      }
    }

    loadFileFromCache()

    // Clean query params to avoid reprocessing
    const next = new URLSearchParams(searchParams)
    next.delete('source')
    next.delete('title')
    next.delete('text')
    next.delete('url')
    next.delete('file')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, t, toast, notificationSuccess, notificationError])

  // Render appropriate form based on type
  const renderContent = () => {
    switch (receiptType) {
      case 'fiscal':
        return <FiscalReceiptForm onBack={handleBack} shareNotice={shareNotice} />
      case 'household':
        return <HouseholdBillForm onBack={handleBack} />
      default:
        return <ReceiptTypeSelector onSelectType={selectType} />
    }
  }

  return <PageTransition>{renderContent()}</PageTransition>
}

export default memo(AddReceiptPage)
