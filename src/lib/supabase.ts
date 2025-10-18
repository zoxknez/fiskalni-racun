import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// Supabase configuration
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
)

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
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          vendor: string | null
          pib: string | null
          date: string
          total_amount: number
          vat_amount: number | null
          category: string | null
          items: Json | null
          image_url: string | null
          pdf_url: string | null
          qr_data: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vendor?: string | null
          pib?: string | null
          date: string
          total_amount: number
          vat_amount?: number | null
          category?: string | null
          items?: Json | null
          image_url?: string | null
          pdf_url?: string | null
          qr_data?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vendor?: string | null
          pib?: string | null
          date?: string
          total_amount?: number
          vat_amount?: number | null
          category?: string | null
          items?: Json | null
          image_url?: string | null
          pdf_url?: string | null
          qr_data?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          id: string
          user_id: string
          receipt_id: string | null
          brand: string
          model: string
          category: string
          serial_number: string | null
          image_url: string | null
          purchase_date: string
          warranty_duration: number
          warranty_expiry: string
          warranty_terms: string | null
          status: 'active' | 'expired' | 'in-service'
          service_center_name: string | null
          service_center_address: string | null
          service_center_phone: string | null
          service_center_hours: string | null
          attachments: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          receipt_id?: string | null
          brand: string
          model: string
          category: string
          serial_number?: string | null
          image_url?: string | null
          purchase_date: string
          warranty_duration: number
          warranty_expiry: string
          warranty_terms?: string | null
          status?: 'active' | 'expired' | 'in-service'
          service_center_name?: string | null
          service_center_address?: string | null
          service_center_phone?: string | null
          service_center_hours?: string | null
          attachments?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          receipt_id?: string | null
          brand?: string
          model?: string
          category?: string
          serial_number?: string | null
          image_url?: string | null
          purchase_date?: string
          warranty_duration?: number
          warranty_expiry?: string
          warranty_terms?: string | null
          status?: 'active' | 'expired' | 'in-service'
          service_center_name?: string | null
          service_center_address?: string | null
          service_center_phone?: string | null
          service_center_hours?: string | null
          attachments?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          consumption: Json | null
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
          consumption?: Json | null
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
          consumption?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          device_id: string
          device_name: string
          device_type: 'mobile' | 'tablet' | 'desktop'
          browser: string
          os: string
          ip_address: string | null
          user_agent: string
          last_activity: string
          expires_at: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          device_id: string
          device_name: string
          device_type: 'mobile' | 'tablet' | 'desktop'
          browser: string
          os: string
          ip_address?: string | null
          user_agent: string
          last_activity?: string
          expires_at: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          device_id?: string
          device_name?: string
          device_type?: 'mobile' | 'tablet' | 'desktop'
          browser?: string
          os?: string
          ip_address?: string | null
          user_agent?: string
          last_activity?: string
          expires_at?: string
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_sessions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      delete_user_data: {
        Args: {
          user_id: string
        }
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Relationships: Record<string, never>
  }
}
