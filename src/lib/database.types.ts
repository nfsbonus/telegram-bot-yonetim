export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      announcements: {
        Row: {
          id: string
          bot_id: string
          title: string
          description: string
          image_url: string | null
          created_at: string
          sent_at: string | null
          status: 'draft' | 'sending' | 'sent' | 'failed' | 'scheduled'
          delivered_count: number
          total_count: number
          scheduled_time: string | null
        }
        Insert: {
          id?: string
          bot_id: string
          title: string
          description: string
          image_url?: string | null
          created_at?: string
          sent_at?: string | null
          status?: 'draft' | 'sending' | 'sent' | 'failed' | 'scheduled'
          delivered_count?: number
          total_count?: number
          scheduled_time?: string | null
        }
        Update: {
          id?: string
          bot_id?: string
          title?: string
          description?: string
          image_url?: string | null
          created_at?: string
          sent_at?: string | null
          status?: 'draft' | 'sending' | 'sent' | 'failed' | 'scheduled'
          delivered_count?: number
          total_count?: number
          scheduled_time?: string | null
        }
      }
      bots: {
        Row: {
          id: string
          name: string
          token: string
          status: string
          created_at: string
          subscribers_count: number
          last_active: string
          user_id: string
          webhook_url: string | null
          commands: Json | null
        }
        Insert: {
          id?: string
          name: string
          token: string
          status?: string
          created_at?: string
          subscribers_count?: number
          last_active?: string
          user_id: string
          webhook_url?: string | null
          commands?: Json | null
        }
        Update: {
          id?: string
          name?: string
          token?: string
          status?: string
          created_at?: string
          subscribers_count?: number
          last_active?: string
          user_id?: string
          webhook_url?: string | null
          commands?: Json | null
        }
      }
      message_templates: {
        Row: {
          id: string
          bot_id: string
          name: string
          title: string
          content: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bot_id: string
          name: string
          title: string
          content: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bot_id?: string
          name?: string
          title?: string
          content?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          telegram_id: number
          username: string
          first_name: string
          last_name: string | null
          joined_at: string
          last_active: string
          is_blocked: boolean
          bot_id: string
        }
        Insert: {
          id?: string
          telegram_id: number
          username: string
          first_name: string
          last_name?: string | null
          joined_at?: string
          last_active?: string
          is_blocked?: boolean
          bot_id: string
        }
        Update: {
          id?: string
          telegram_id?: number
          username?: string
          first_name?: string
          last_name?: string | null
          joined_at?: string
          last_active?: string
          is_blocked?: boolean
          bot_id?: string
        }
      }
    }
  }
}