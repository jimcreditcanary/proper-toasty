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
          role: string;
          blocked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          credits?: number;
          api_key?: string | null;
          role?: string;
          blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          credits?: number;
          api_key?: string | null;
          role?: string;
          blocked?: boolean;
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
      ob_payments: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          verification_id: string | null;
          obconnect_payment_id: string | null;
          amount: number;
          currency: string;
          payee_name: string;
          sort_code: string;
          account_number: string;
          reference: string;
          status: string;
          auth_url: string | null;
          reason: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          verification_id?: string | null;
          obconnect_payment_id?: string | null;
          amount: number;
          currency?: string;
          payee_name: string;
          sort_code: string;
          account_number: string;
          reference: string;
          status?: string;
          auth_url?: string | null;
          reason?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          verification_id?: string | null;
          obconnect_payment_id?: string | null;
          amount?: number;
          currency?: string;
          payee_name?: string;
          sort_code?: string;
          account_number?: string;
          reference?: string;
          status?: string;
          auth_url?: string | null;
          reason?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ob_payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ob_payments_verification_id_fkey";
            columns: ["verification_id"];
            isOneToOne: false;
            referencedRelation: "verifications";
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
      leads: {
        Row: {
          id: string;
          email: string;
          verification_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          verification_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          verification_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_verification_id_fkey";
            columns: ["verification_id"];
            isOneToOne: false;
            referencedRelation: "verifications";
            referencedColumns: ["id"];
          },
        ];
      };
      verifications: {
        Row: {
          id: string;
          user_id: string | null;
          created_at: string;
          flow_type: string | null;
          marketplace_url: string | null;
          marketplace_item_title: string | null;
          marketplace_listed_price: number | null;
          valuation_min: number | null;
          valuation_max: number | null;
          valuation_summary: string | null;
          google_reviews_rating: number | null;
          google_reviews_count: number | null;
          google_reviews_summary: string | null;
          invoice_file_path: string | null;
          payee_type: string | null;
          payee_name: string | null;
          company_name_input: string | null;
          sort_code: string | null;
          account_number: string | null;
          vat_number_input: string | null;
          invoice_amount: number | null;
          purchase_category: string | null;
          check_tier: string | null;
          extracted_company_name: string | null;
          extracted_vat_number: string | null;
          extracted_invoice_amount: number | null;
          extracted_sort_code: string | null;
          extracted_account_number: string | null;
          companies_house_result: Json | null;
          companies_house_name: string | null;
          companies_house_number: string | null;
          companies_house_status: string | null;
          companies_house_incorporated_date: string | null;
          companies_house_accounts_date: string | null;
          companies_house_accounts_overdue: boolean | null;
          hmrc_vat_result: Json | null;
          vat_api_name: string | null;
          bank_verify_result: Json | null;
          cop_result: string | null;
          cop_reason: string | null;
          overall_risk: string | null;
          status: string | null;
          anthropic_tokens_used: number | null;
          short_id: string;
          marketplace_source: string | null;
          marketplace_other: string | null;
          marketplace_screenshot_url: string | null;
          vehicle_reg: string | null;
          dvla_data: Json | null;
          vehicle_valuation: Json | null;
          selected_checks: string[] | null;
          cop_returned_name: string | null;
          cop_reason_code: string | null;
          cop_account_type_match: boolean | null;
          property_postcode: string | null;
          property_address: string | null;
          property_uprn: string | null;
          property_udprn: string | null;
          property_data: Json | null;
          vehicle_tips: Json | null;
          marketplace_plate_match: Json | null;
          vehicle_mileage: number | null;
          credits_used: number | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          created_at?: string;
          flow_type?: string | null;
          short_id?: string;
          marketplace_url?: string | null;
          marketplace_item_title?: string | null;
          marketplace_listed_price?: number | null;
          valuation_min?: number | null;
          valuation_max?: number | null;
          valuation_summary?: string | null;
          google_reviews_rating?: number | null;
          google_reviews_count?: number | null;
          google_reviews_summary?: string | null;
          invoice_file_path?: string | null;
          payee_type?: string | null;
          payee_name?: string | null;
          company_name_input?: string | null;
          sort_code?: string | null;
          account_number?: string | null;
          vat_number_input?: string | null;
          invoice_amount?: number | null;
          purchase_category?: string | null;
          check_tier?: string | null;
          extracted_company_name?: string | null;
          extracted_vat_number?: string | null;
          extracted_invoice_amount?: number | null;
          extracted_sort_code?: string | null;
          extracted_account_number?: string | null;
          companies_house_result?: Json | null;
          companies_house_name?: string | null;
          companies_house_number?: string | null;
          companies_house_status?: string | null;
          companies_house_incorporated_date?: string | null;
          companies_house_accounts_date?: string | null;
          companies_house_accounts_overdue?: boolean | null;
          hmrc_vat_result?: Json | null;
          vat_api_name?: string | null;
          bank_verify_result?: Json | null;
          cop_result?: string | null;
          cop_reason?: string | null;
          overall_risk?: string | null;
          status?: string | null;
          anthropic_tokens_used?: number | null;
          marketplace_source?: string | null;
          marketplace_other?: string | null;
          marketplace_screenshot_url?: string | null;
          vehicle_reg?: string | null;
          dvla_data?: Json | null;
          vehicle_valuation?: Json | null;
          selected_checks?: string[] | null;
          cop_returned_name?: string | null;
          cop_reason_code?: string | null;
          cop_account_type_match?: boolean | null;
          property_postcode?: string | null;
          property_address?: string | null;
          property_uprn?: string | null;
          property_udprn?: string | null;
          property_data?: Json | null;
          vehicle_tips?: Json | null;
          marketplace_plate_match?: Json | null;
          vehicle_mileage?: number | null;
          credits_used?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          short_id?: string;
          flow_type?: string | null;
          marketplace_url?: string | null;
          marketplace_item_title?: string | null;
          marketplace_listed_price?: number | null;
          valuation_min?: number | null;
          valuation_max?: number | null;
          valuation_summary?: string | null;
          google_reviews_rating?: number | null;
          google_reviews_count?: number | null;
          google_reviews_summary?: string | null;
          invoice_file_path?: string | null;
          payee_type?: string | null;
          payee_name?: string | null;
          company_name_input?: string | null;
          sort_code?: string | null;
          account_number?: string | null;
          vat_number_input?: string | null;
          invoice_amount?: number | null;
          purchase_category?: string | null;
          check_tier?: string | null;
          extracted_company_name?: string | null;
          extracted_vat_number?: string | null;
          extracted_invoice_amount?: number | null;
          extracted_sort_code?: string | null;
          extracted_account_number?: string | null;
          companies_house_result?: Json | null;
          companies_house_name?: string | null;
          companies_house_number?: string | null;
          companies_house_status?: string | null;
          companies_house_incorporated_date?: string | null;
          companies_house_accounts_date?: string | null;
          companies_house_accounts_overdue?: boolean | null;
          hmrc_vat_result?: Json | null;
          vat_api_name?: string | null;
          bank_verify_result?: Json | null;
          cop_result?: string | null;
          cop_reason?: string | null;
          overall_risk?: string | null;
          status?: string | null;
          anthropic_tokens_used?: number | null;
          marketplace_source?: string | null;
          marketplace_other?: string | null;
          marketplace_screenshot_url?: string | null;
          vehicle_reg?: string | null;
          dvla_data?: Json | null;
          vehicle_valuation?: Json | null;
          selected_checks?: string[] | null;
          cop_returned_name?: string | null;
          cop_reason_code?: string | null;
          cop_account_type_match?: boolean | null;
          property_postcode?: string | null;
          property_address?: string | null;
          property_uprn?: string | null;
          property_udprn?: string | null;
          property_data?: Json | null;
          vehicle_tips?: Json | null;
          marketplace_plate_match?: Json | null;
          vehicle_mileage?: number | null;
          credits_used?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_impressions: {
        Row: {
          id: string;
          session_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_lookups: {
        Row: {
          id: string;
          verification_id: string | null;
          registration_number: string;
          make: string | null;
          colour: string | null;
          fuel_type: string | null;
          engine_capacity: number | null;
          year_of_manufacture: number | null;
          month_of_first_registration: string | null;
          tax_status: string | null;
          tax_due_date: string | null;
          mot_status: string | null;
          mot_expiry_date: string | null;
          co2_emissions: number | null;
          marked_for_export: boolean | null;
          type_approval: string | null;
          wheelplan: string | null;
          revenue_weight: number | null;
          euro_status: string | null;
          date_of_last_v5c_issued: string | null;
          raw_response: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          verification_id?: string | null;
          registration_number: string;
          make?: string | null;
          colour?: string | null;
          fuel_type?: string | null;
          engine_capacity?: number | null;
          year_of_manufacture?: number | null;
          month_of_first_registration?: string | null;
          tax_status?: string | null;
          tax_due_date?: string | null;
          mot_status?: string | null;
          mot_expiry_date?: string | null;
          co2_emissions?: number | null;
          marked_for_export?: boolean | null;
          type_approval?: string | null;
          wheelplan?: string | null;
          revenue_weight?: number | null;
          euro_status?: string | null;
          date_of_last_v5c_issued?: string | null;
          raw_response: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          verification_id?: string | null;
          registration_number?: string;
          make?: string | null;
          colour?: string | null;
          fuel_type?: string | null;
          engine_capacity?: number | null;
          year_of_manufacture?: number | null;
          month_of_first_registration?: string | null;
          tax_status?: string | null;
          tax_due_date?: string | null;
          mot_status?: string | null;
          mot_expiry_date?: string | null;
          co2_emissions?: number | null;
          marked_for_export?: boolean | null;
          type_approval?: string | null;
          wheelplan?: string | null;
          revenue_weight?: number | null;
          euro_status?: string | null;
          date_of_last_v5c_issued?: string | null;
          raw_response?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      property_lookups: {
        Row: {
          id: string;
          verification_id: string | null;
          postcode: string;
          address_summary: string | null;
          uprn: string | null;
          udprn: string | null;
          raw_response: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          verification_id?: string | null;
          postcode: string;
          address_summary?: string | null;
          uprn?: string | null;
          udprn?: string | null;
          raw_response: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          verification_id?: string | null;
          postcode?: string;
          address_summary?: string | null;
          uprn?: string | null;
          udprn?: string | null;
          raw_response?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      checks: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          status: "draft" | "running" | "complete" | "failed";
          uprn: string | null;
          udprn: string | null;
          address_formatted: string | null;
          address_line1: string | null;
          address_line2: string | null;
          post_town: string | null;
          postcode: string | null;
          latitude: number | null;
          longitude: number | null;
          country: "England" | "Wales" | "Scotland" | "Northern Ireland" | null;
          tenure: "owner" | "landlord" | "tenant" | "social" | null;
          current_heating_fuel: "gas" | "oil" | "lpg" | "electric" | "heat_pump" | "biomass" | "other" | null;
          hot_water_tank_present: "yes" | "no" | "unsure" | null;
          outdoor_space_for_ashp: "yes" | "no" | "unsure" | null;
          hybrid_preference: "replace" | "hybrid" | "undecided" | null;
          electricity_tariff: Json | null;
          gas_tariff: Json | null;
          floorplan_object_key: string | null;
          floorplan_uploaded_at: string | null;
          share_token: string | null;
          share_expires_at: string | null;
          credits_spent: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          status?: "draft" | "running" | "complete" | "failed";
          uprn?: string | null;
          udprn?: string | null;
          address_formatted?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          post_town?: string | null;
          postcode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          country?: "England" | "Wales" | "Scotland" | "Northern Ireland" | null;
          tenure?: "owner" | "landlord" | "tenant" | "social" | null;
          current_heating_fuel?: "gas" | "oil" | "lpg" | "electric" | "heat_pump" | "biomass" | "other" | null;
          hot_water_tank_present?: "yes" | "no" | "unsure" | null;
          outdoor_space_for_ashp?: "yes" | "no" | "unsure" | null;
          hybrid_preference?: "replace" | "hybrid" | "undecided" | null;
          electricity_tariff?: Json | null;
          gas_tariff?: Json | null;
          floorplan_object_key?: string | null;
          floorplan_uploaded_at?: string | null;
          share_token?: string | null;
          share_expires_at?: string | null;
          credits_spent?: number;
        };
        Update: Partial<Database["public"]["Tables"]["checks"]["Insert"]>;
        Relationships: [];
      };
      check_results: {
        Row: {
          check_id: string;
          epc_raw: Json | null;
          epc_recommendations_raw: Json | null;
          solar_raw: Json | null;
          pvgis_raw: Json | null;
          flood_raw: Json | null;
          listed_raw: Json | null;
          planning_raw: Json | null;
          floorplan_analysis: Json | null;
          eligibility: Json | null;
          finance: Json | null;
          savings_raw: Json | null;
          generated_at: string;
        };
        Insert: {
          check_id: string;
          epc_raw?: Json | null;
          epc_recommendations_raw?: Json | null;
          solar_raw?: Json | null;
          pvgis_raw?: Json | null;
          flood_raw?: Json | null;
          listed_raw?: Json | null;
          planning_raw?: Json | null;
          floorplan_analysis?: Json | null;
          eligibility?: Json | null;
          finance?: Json | null;
          savings_raw?: Json | null;
          generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["check_results"]["Insert"]>;
        Relationships: [];
      };
      api_cache: {
        Row: {
          namespace: string;
          key: string;
          payload: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          namespace: string;
          key: string;
          payload: Json;
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["api_cache"]["Insert"]>;
        Relationships: [];
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
      deduct_credits: {
        Args: {
          p_user_id: string;
          p_count: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
