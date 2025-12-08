/**
 * DealsPage Types
 *
 * Shared types and constants for the DealsPage
 */

import {
  Dumbbell,
  Home,
  MoreHorizontal,
  Plane,
  Shirt,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react'

// Form data interface for creating/editing deals
export interface DealFormData {
  title: string
  description: string
  originalPrice: string
  discountedPrice: string
  discountPercent: string
  store: string
  category: string
  url: string
  expiresAt: string
  location: string
  isOnline: boolean
}

// Initial form data
export const INITIAL_FORM_DATA: DealFormData = {
  title: '',
  description: '',
  originalPrice: '',
  discountedPrice: '',
  discountPercent: '',
  store: '',
  category: 'other',
  url: '',
  expiresAt: '',
  location: '',
  isOnline: true,
}

// Category icons mapping
export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  electronics: Smartphone,
  fashion: Shirt,
  food: UtensilsCrossed,
  home: Home,
  beauty: Sparkles,
  sports: Dumbbell,
  travel: Plane,
  services: Wrench,
  other: MoreHorizontal,
}

// Get category icon
export function getCategoryIcon(category: string): React.ElementType {
  return CATEGORY_ICONS[category] || MoreHorizontal
}
