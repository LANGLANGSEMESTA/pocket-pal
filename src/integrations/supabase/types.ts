export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          alert_threshold: number | null
          created_at: string | null
          currency: string | null
          id: string
          month: number
          total_limit: number
          user_id: string
          year: number
        }
        Insert: {
          alert_threshold?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          month: number
          total_limit: number
          user_id: string
          year: number
        }
        Update: {
          alert_threshold?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          month?: number
          total_limit?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_child: {
        Row: {
          budget_limit: number | null
          child_id: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          invite_code: string | null
          parent_id: string | null
        }
        Insert: {
          budget_limit?: number | null
          child_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          invite_code?: string | null
          parent_id?: string | null
        }
        Update: {
          budget_limit?: number | null
          child_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          invite_code?: string | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          home_currency: string | null
          id: string
          onboarding_complete: boolean | null
          preferensi_bahasa: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          home_currency?: string | null
          id: string
          onboarding_complete?: boolean | null
          preferensi_bahasa?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          home_currency?: string | null
          id?: string
          onboarding_complete?: boolean | null
          preferensi_bahasa?: string | null
          username?: string | null
        }
        Relationships: []
      }
      split_settlements: {
        Row: {
          amount_owed: number
          created_at: string | null
          created_by: string | null
          id: string
          is_settled: boolean | null
          member_name: string
          member_phone: string | null
          settled_at: string | null
          transaction_id: string
        }
        Insert: {
          amount_owed: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_settled?: boolean | null
          member_name: string
          member_phone?: string | null
          settled_at?: string | null
          transaction_id: string
        }
        Update: {
          amount_owed?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_settled?: boolean | null
          member_name?: string
          member_phone?: string | null
          settled_at?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_settlements_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          avg_consumption_days: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          item_name: string
          last_purchase_date: string | null
          predicted_next_date: string | null
          user_id: string
        }
        Insert: {
          avg_consumption_days?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_name: string
          last_purchase_date?: string | null
          predicted_next_date?: string | null
          user_id: string
        }
        Update: {
          avg_consumption_days?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_name?: string
          last_purchase_date?: string | null
          predicted_next_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          assigned_to: string | null
          id: string
          item_name: string
          price: number
          transaction_id: string
        }
        Insert: {
          assigned_to?: string | null
          id?: string
          item_name: string
          price: number
          transaction_id: string
        }
        Update: {
          assigned_to?: string | null
          id?: string
          item_name?: string
          price?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          category: string | null
          conversion_rate: number | null
          converted_amount: number | null
          created_at: string | null
          home_currency: string | null
          id: string
          is_itemized: boolean | null
          merchant_name: string | null
          notes: string | null
          original_currency: string | null
          payment_method: string | null
          total_amount: number
          transaction_date: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          conversion_rate?: number | null
          converted_amount?: number | null
          created_at?: string | null
          home_currency?: string | null
          id?: string
          is_itemized?: boolean | null
          merchant_name?: string | null
          notes?: string | null
          original_currency?: string | null
          payment_method?: string | null
          total_amount: number
          transaction_date?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          conversion_rate?: number | null
          converted_amount?: number | null
          created_at?: string | null
          home_currency?: string | null
          id?: string
          is_itemized?: boolean | null
          merchant_name?: string | null
          notes?: string | null
          original_currency?: string | null
          payment_method?: string | null
          total_amount?: number
          transaction_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
