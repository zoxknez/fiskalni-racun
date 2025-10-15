import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          vendor: string
          pib: string | null
          date: string
          total_amount: number
          vat_amount: number | null
          category: string | null
          payment_method: string | null
          items: Record<string, unknown> | null
          image_url: string | null
          qr_data: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vendor: string
          pib?: string | null
          date: string
          total_amount: number
          vat_amount?: number | null
          category?: string | null
          payment_method?: string | null
          items?: any | null
          image_url?: string | null
          qr_data?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vendor?: string
          pib?: string | null
          date?: string
          total_amount?: number
          vat_amount?: number | null
          category?: string | null
          payment_method?: string | null
          items?: any | null
          image_url?: string | null
          qr_data?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          user_id: string
          brand: string
          model: string
          category: string
          purchase_date: string
          warranty_months: number
          warranty_end_date: string
          serial_number: string | null
          purchase_price: number | null
          store: string | null
          receipt_image_url: string | null
          device_image_url: string | null
          notes: string | null
          service_center_name: string | null
          service_center_phone: string | null
          in_service: boolean
          service_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand: string
          model: string
          category: string
          purchase_date: string
          warranty_months: number
          warranty_end_date: string
          serial_number?: string | null
          purchase_price?: number | null
          store?: string | null
          receipt_image_url?: string | null
          device_image_url?: string | null
          notes?: string | null
          service_center_name?: string | null
          service_center_phone?: string | null
          in_service?: boolean
          service_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand?: string
          model?: string
          category?: string
          purchase_date?: string
          warranty_months?: number
          warranty_end_date?: string
          serial_number?: string | null
          purchase_price?: number | null
          store?: string | null
          receipt_image_url?: string | null
          device_image_url?: string | null
          notes?: string | null
          service_center_name?: string | null
          service_center_phone?: string | null
          in_service?: boolean
          service_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      household_bills: {
        Row: {
          id: string
          user_id: string
          bill_type: string
          provider: string
          account_number: string | null
          amount: number
          billing_period_start: string
          billing_period_end: string
          due_date: string
          payment_date: string | null
          status: string
          consumption: Record<string, unknown> | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bill_type: string
          provider: string
          account_number?: string | null
          amount: number
          billing_period_start: string
          billing_period_end: string
          due_date: string
          payment_date?: string | null
          status?: string
          consumption?: Record<string, unknown> | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bill_type?: string
          provider?: string
          account_number?: string | null
          amount?: number
          billing_period_start?: string
          billing_period_end?: string
          due_date?: string
          payment_date?: string | null
          status?: string
          consumption?: Record<string, unknown> | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
