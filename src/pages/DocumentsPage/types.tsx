/**
 * DocumentsPage Types
 *
 * Shared types and constants for the Documents page components
 */

import type { Document, DocumentType } from '@lib/db'
import { Calendar, File, FilesIcon, FileText, Heart, Shield } from 'lucide-react'
import type { ReactNode } from 'react'

export type DocumentTab =
  | 'id_card'
  | 'passport'
  | 'driver_license'
  | 'vehicle_registration'
  | 'health_insurance'
  | 'other'
  | 'all'

export type DocumentTypeLabelKey =
  | 'documents.types.id_card'
  | 'documents.types.passport'
  | 'documents.types.driver_license'
  | 'documents.types.vehicle_registration'
  | 'documents.types.registration_date'
  | 'documents.types.health_insurance'
  | 'documents.types.other'

export interface DocumentTypeOption {
  value: DocumentType
  labelKey: DocumentTypeLabelKey
  icon: ReactNode
  color: string
}

export const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    value: 'id_card',
    labelKey: 'documents.types.id_card',
    icon: <Shield className="h-5 w-5" />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    value: 'passport',
    labelKey: 'documents.types.passport',
    icon: <FileText className="h-5 w-5" />,
    color: 'from-purple-500 to-purple-600',
  },
  {
    value: 'driver_license',
    labelKey: 'documents.types.driver_license',
    icon: <FilesIcon className="h-5 w-5" />,
    color: 'from-orange-500 to-orange-600',
  },
  {
    value: 'vehicle_registration',
    labelKey: 'documents.types.vehicle_registration',
    icon: <FileText className="h-5 w-5" />,
    color: 'from-red-500 to-red-600',
  },
  {
    value: 'registration_date',
    labelKey: 'documents.types.registration_date',
    icon: <Calendar className="h-5 w-5" />,
    color: 'from-green-500 to-green-600',
  },
  {
    value: 'health_insurance',
    labelKey: 'documents.types.health_insurance',
    icon: <Heart className="h-5 w-5" />,
    color: 'from-pink-500 to-pink-600',
  },
  {
    value: 'other',
    labelKey: 'documents.types.other',
    icon: <File className="h-5 w-5" />,
    color: 'from-slate-500 to-slate-600',
  },
]

// Helper function to get document type info
export function getDocumentTypeInfo(type: DocumentType): DocumentTypeOption {
  return (
    DOCUMENT_TYPES.find((dt) => dt.value === type) ??
    DOCUMENT_TYPES.find((dt) => dt.value === 'other')!
  )
}

// Re-export types
export type { Document, DocumentType }
