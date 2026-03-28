export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          credits: number;
          api_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          credits?: number;
          api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          credits?: number;
          api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scans: {
        Row: {
          id: string;
          user_id: string;
          file_url: string;
          file_name: string;
          status: "pending" | "processing" | "completed" | "failed";
          extracted_data: Json | null;
          company_name: string | null;
          vat_number: string | null;
          company_number: string | null;
          sort_code: string | null;
          account_number: string | null;
          companies_house_result: Json | null;
          hmrc_vat_result: Json | null;
          bank_verify_result: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_url: string;
          file_name: string;
          status?: "pending" | "processing" | "completed" | "failed";
          extracted_data?: Json | null;
          company_name?: string | null;
          vat_number?: string | null;
          company_number?: string | null;
          sort_code?: string | null;
          account_number?: string | null;
          companies_house_result?: Json | null;
          hmrc_vat_result?: Json | null;
          bank_verify_result?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_url?: string;
          file_name?: string;
          status?: "pending" | "processing" | "completed" | "failed";
          extracted_data?: Json | null;
          company_name?: string | null;
          vat_number?: string | null;
          company_number?: string | null;
          sort_code?: string | null;
          account_number?: string | null;
          companies_house_result?: Json | null;
          hmrc_vat_result?: Json | null;
          bank_verify_result?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      api_logs: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          method: string;
          status_code: number;
          credits_used: number;
          duration_ms: number | null;
          request_summary: Json | null;
          response_summary: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          method?: string;
          status_code?: number;
          credits_used?: number;
          duration_ms?: number | null;
          request_summary?: Json | null;
          response_summary?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          method?: string;
          status_code?: number;
          credits_used?: number;
          duration_ms?: number | null;
          request_summary?: Json | null;
          response_summary?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          stripe_session_id: string;
          stripe_payment_intent_id: string | null;
          amount: number;
          credits_purchased: number;
          status: "pending" | "completed" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_session_id: string;
          stripe_payment_intent_id?: string | null;
          amount: number;
          credits_purchased: number;
          status?: "pending" | "completed" | "failed";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_session_id?: string;
          stripe_payment_intent_id?: string | null;
          amount?: number;
          credits_purchased?: number;
          status?: "pending" | "completed" | "failed";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      deduct_credit: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
