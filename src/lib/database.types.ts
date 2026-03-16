export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string | null
          country: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone?: string | null
          country?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone?: string | null
          country?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          youtube_video_id: string
          youtube_embed_token: string
          event_date: string
          event_type: 'live' | 'premiere' | 'recorded'
          price: number
          currency: 'ARS' | 'USD' | 'BRL'
          thumbnail_url: string | null
          status: 'draft' | 'published' | 'live' | 'ended' | 'cancelled'
          max_attendees: number | null
          access_window_hours: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          youtube_video_id: string
          youtube_embed_token?: string
          event_date: string
          event_type?: 'live' | 'premiere' | 'recorded'
          price: number
          currency?: 'ARS' | 'USD' | 'BRL'
          thumbnail_url?: string | null
          status?: 'draft' | 'published' | 'live' | 'ended' | 'cancelled'
          max_attendees?: number | null
          access_window_hours?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          youtube_video_id?: string
          youtube_embed_token?: string
          event_date?: string
          event_type?: 'live' | 'premiere' | 'recorded'
          price?: number
          currency?: 'ARS' | 'USD' | 'BRL'
          thumbnail_url?: string | null
          status?: 'draft' | 'published' | 'live' | 'ended' | 'cancelled'
          max_attendees?: number | null
          access_window_hours?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          event_id: string
          payment_method: 'mercadopago' | 'astropay' | 'bank_transfer'
          payment_status: 'pending' | 'approved' | 'rejected' | 'refunded'
          amount: number
          currency: string
          transaction_id: string | null
          payment_proof_url: string | null
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          refund_status: 'none' | 'requested' | 'partial' | 'full'
          refunded_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          payment_method: 'mercadopago' | 'astropay' | 'bank_transfer'
          payment_status?: 'pending' | 'approved' | 'rejected' | 'refunded'
          amount: number
          currency: string
          transaction_id?: string | null
          payment_proof_url?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          refund_status?: 'none' | 'requested' | 'partial' | 'full'
          refunded_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          payment_method?: 'mercadopago' | 'astropay' | 'bank_transfer'
          payment_status?: 'pending' | 'approved' | 'rejected' | 'refunded'
          amount?: number
          currency?: string
          transaction_id?: string | null
          payment_proof_url?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          refund_status?: 'none' | 'requested' | 'partial' | 'full'
          refunded_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      access_tokens: {
        Row: {
          id: string
          purchase_id: string
          user_id: string
          event_id: string
          token: string
          expires_at: string
          last_validated_at: string | null
          validation_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          purchase_id: string
          user_id: string
          event_id: string
          token: string
          expires_at: string
          last_validated_at?: string | null
          validation_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          purchase_id?: string
          user_id?: string
          event_id?: string
          token?: string
          expires_at?: string
          last_validated_at?: string | null
          validation_count?: number
          is_active?: boolean
          created_at?: string
        }
      }
      analytics_views: {
        Row: {
          id: string
          user_id: string | null
          event_id: string
          session_id: string
          duration_seconds: number | null
          ip_address_hash: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_id: string
          session_id: string
          duration_seconds?: number | null
          ip_address_hash: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_id?: string
          session_id?: string
          duration_seconds?: number | null
          ip_address_hash?: string
          user_agent?: string | null
          created_at?: string
        }
      }
      payment_webhooks: {
        Row: {
          id: string
          provider: 'mercadopago' | 'astropay'
          webhook_data: Json
          processed: boolean
          purchase_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: 'mercadopago' | 'astropay'
          webhook_data: Json
          processed?: boolean
          purchase_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: 'mercadopago' | 'astropay'
          webhook_data?: Json
          processed?: boolean
          purchase_id?: string | null
          created_at?: string
        }
      }
      refunds: {
        Row: {
          id: string
          purchase_id: string
          amount: number
          reason: 'event_cancelled' | 'technical_issue' | 'user_request' | 'duplicate_payment' | 'other'
          reason_details: string | null
          status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed'
          payment_method: 'mercadopago' | 'astropay' | 'bank_transfer'
          refund_transaction_id: string | null
          requested_by: string
          requested_at: string
          processed_by: string | null
          processed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          purchase_id: string
          amount: number
          reason: 'event_cancelled' | 'technical_issue' | 'user_request' | 'duplicate_payment' | 'other'
          reason_details?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed'
          payment_method: 'mercadopago' | 'astropay' | 'bank_transfer'
          refund_transaction_id?: string | null
          requested_by: string
          requested_at?: string
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          purchase_id?: string
          amount?: number
          reason?: 'event_cancelled' | 'technical_issue' | 'user_request' | 'duplicate_payment' | 'other'
          reason_details?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed'
          payment_method?: 'mercadopago' | 'astropay' | 'bank_transfer'
          refund_transaction_id?: string | null
          requested_by?: string
          requested_at?: string
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
        }
      }
      user_bank_accounts: {
        Row: {
          id: string
          user_id: string
          account_holder_name: string
          bank_name: string
          account_type: 'savings' | 'checking' | 'cbu' | 'cvu'
          account_number: string
          country: string
          is_verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_holder_name: string
          bank_name: string
          account_type: 'savings' | 'checking' | 'cbu' | 'cvu'
          account_number: string
          country: string
          is_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_holder_name?: string
          bank_name?: string
          account_type?: 'savings' | 'checking' | 'cbu' | 'cvu'
          account_number?: string
          country?: string
          is_verified?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'user' | 'admin'
      event_type: 'live' | 'premiere' | 'recorded'
      event_status: 'draft' | 'published' | 'live' | 'ended' | 'cancelled'
      payment_method_type: 'mercadopago' | 'astropay' | 'bank_transfer'
      payment_status_type: 'pending' | 'approved' | 'rejected' | 'refunded'
      currency_type: 'ARS' | 'USD' | 'BRL'
      refund_status_type: 'none' | 'requested' | 'partial' | 'full'
      refund_reason_type: 'event_cancelled' | 'technical_issue' | 'user_request' | 'duplicate_payment' | 'other'
      refund_process_status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed'
      account_type: 'savings' | 'checking' | 'cbu' | 'cvu'
      webhook_provider: 'mercadopago' | 'astropay'
    }
  }
}
