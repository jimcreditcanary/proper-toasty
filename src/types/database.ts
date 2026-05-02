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
          role: "admin" | "user" | "installer";
          blocked: boolean;
          // Migration 042 — C2 auto top-up
          stripe_customer_id: string | null;
          auto_recharge_pack_id:
            | "starter"
            | "growth"
            | "scale"
            | "volume"
            | null;
          auto_recharge_failed_at: string | null;
          auto_recharge_failure_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          credits?: number;
          api_key?: string | null;
          role?: "admin" | "user" | "installer";
          blocked?: boolean;
          stripe_customer_id?: string | null;
          auto_recharge_pack_id?:
            | "starter"
            | "growth"
            | "scale"
            | "volume"
            | null;
          auto_recharge_failed_at?: string | null;
          auto_recharge_failure_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          credits?: number;
          api_key?: string | null;
          role?: "admin" | "user" | "installer";
          blocked?: boolean;
          stripe_customer_id?: string | null;
          auto_recharge_pack_id?:
            | "starter"
            | "growth"
            | "scale"
            | "volume"
            | null;
          auto_recharge_failed_at?: string | null;
          auto_recharge_failure_reason?: string | null;
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
      homeowner_leads: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          address: string | null;
          postcode: string | null;
          uprn: string | null;
          latitude: number | null;
          longitude: number | null;
          consent_marketing: boolean;
          consent_installer_matching: boolean;
          analysis_snapshot: Json | null;
          user_type: "homeowner" | "installer" | "admin";
          source: "check_flow" | "installer_signup" | "waitlist" | "other";
          user_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          // Denormalised tariff metadata (migration 027). Pulled from
          // analysis_snapshot.electricityTariff / .gasTariff at write time
          // so analytics queries don't have to grovel through the jsonb.
          electricity_supplier: string | null;
          gas_supplier: string | null;
          electricity_unit_rate_p_per_kwh: number | null;
          gas_unit_rate_p_per_kwh: number | null;
          electricity_standing_charge_p_per_day: number | null;
          gas_standing_charge_p_per_day: number | null;
          annual_electricity_kwh: number | null;
          annual_gas_kwh: number | null;
          tariff_source: "bill_upload" | "manual_known" | "manual_estimate" | null;
          is_time_of_use_tariff: boolean | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          phone?: string | null;
          address?: string | null;
          postcode?: string | null;
          uprn?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          consent_marketing?: boolean;
          consent_installer_matching?: boolean;
          analysis_snapshot?: Json | null;
          user_type?: "homeowner" | "installer" | "admin";
          source?: "check_flow" | "installer_signup" | "waitlist" | "other";
          user_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          electricity_supplier?: string | null;
          gas_supplier?: string | null;
          electricity_unit_rate_p_per_kwh?: number | null;
          gas_unit_rate_p_per_kwh?: number | null;
          electricity_standing_charge_p_per_day?: number | null;
          gas_standing_charge_p_per_day?: number | null;
          annual_electricity_kwh?: number | null;
          annual_gas_kwh?: number | null;
          tariff_source?: "bill_upload" | "manual_known" | "manual_estimate" | null;
          is_time_of_use_tariff?: boolean | null;
        };
        Update: Partial<Database["public"]["Tables"]["homeowner_leads"]["Insert"]>;
        Relationships: [];
      };
      installers: {
        Row: {
          id: number;
          certification_number: string;
          certification_body: string;
          company_name: string;
          email: string | null;
          telephone: string | null;
          website: string | null;
          address_line_1: string | null;
          address_line_2: string | null;
          address_line_3: string | null;
          county: string | null;
          postcode: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          bus_registered: boolean;
          cap_air_source_heat_pump: boolean;
          cap_battery_storage: boolean;
          cap_biomass: boolean;
          cap_exhaust_air_heat_pump: boolean;
          cap_gas_absorption_heat_pump: boolean;
          cap_ground_source_heat_pump: boolean;
          cap_water_source_heat_pump: boolean;
          cap_hydro: boolean;
          cap_micro_chp: boolean;
          cap_solar_assisted_heat_pump: boolean;
          cap_solar_pv: boolean;
          cap_solar_thermal: boolean;
          cap_wind_turbine: boolean;
          region_east_midlands: boolean;
          region_eastern: boolean;
          region_london: boolean;
          region_north_east: boolean;
          region_north_west: boolean;
          region_northern_ireland: boolean;
          region_scotland: boolean;
          region_south_east: boolean;
          region_south_west: boolean;
          region_wales: boolean;
          region_west_midlands: boolean;
          region_yorkshire_humberside: boolean;
          company_number: string | null;
          ch_matched_name: string | null;
          ch_matched_address: string | null;
          ch_match_source: string | null;
          ch_match_confidence: "high" | "medium" | "low" | "uncertain" | null;
          reviews_score: number;
          reviews_count: number;
          source: string;
          scraped_at: string;
          technology_sub_type: string | null;
          raw_regions_covered: string | null;
          raw_technologies: string | null;
          // Migration 031 — Companies House + Checkatrade enrichment
          incorporation_date: string | null;
          years_in_business: number | null;
          companies_house_fetched_at: string | null;
          companies_house_status: string | null;
          checkatrade_score: number | null;
          checkatrade_review_count: number | null;
          checkatrade_url: string | null;
          checkatrade_fetched_at: string | null;
          checkatrade_status: string | null;
          // Migration 037 — installer-configurable visit length + travel buffer
          meeting_duration_min: number;
          travel_buffer_min: number;
          // Migration 039 — F2 installer claim binding
          user_id: string | null;
          claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          certification_number: string;
          certification_body: string;
          company_name: string;
          email?: string | null;
          telephone?: string | null;
          website?: string | null;
          address_line_1?: string | null;
          address_line_2?: string | null;
          address_line_3?: string | null;
          county?: string | null;
          postcode?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          bus_registered?: boolean;
          cap_air_source_heat_pump?: boolean;
          cap_battery_storage?: boolean;
          cap_biomass?: boolean;
          cap_exhaust_air_heat_pump?: boolean;
          cap_gas_absorption_heat_pump?: boolean;
          cap_ground_source_heat_pump?: boolean;
          cap_water_source_heat_pump?: boolean;
          cap_hydro?: boolean;
          cap_micro_chp?: boolean;
          cap_solar_assisted_heat_pump?: boolean;
          cap_solar_pv?: boolean;
          cap_solar_thermal?: boolean;
          cap_wind_turbine?: boolean;
          region_east_midlands?: boolean;
          region_eastern?: boolean;
          region_london?: boolean;
          region_north_east?: boolean;
          region_north_west?: boolean;
          region_northern_ireland?: boolean;
          region_scotland?: boolean;
          region_south_east?: boolean;
          region_south_west?: boolean;
          region_wales?: boolean;
          region_west_midlands?: boolean;
          region_yorkshire_humberside?: boolean;
          company_number?: string | null;
          ch_matched_name?: string | null;
          ch_matched_address?: string | null;
          ch_match_source?: string | null;
          ch_match_confidence?: "high" | "medium" | "low" | "uncertain" | null;
          reviews_score?: number;
          reviews_count?: number;
          source?: string;
          scraped_at?: string;
          technology_sub_type?: string | null;
          raw_regions_covered?: string | null;
          raw_technologies?: string | null;
          incorporation_date?: string | null;
          years_in_business?: number | null;
          companies_house_fetched_at?: string | null;
          companies_house_status?: string | null;
          checkatrade_score?: number | null;
          checkatrade_review_count?: number | null;
          checkatrade_url?: string | null;
          checkatrade_fetched_at?: string | null;
          checkatrade_status?: string | null;
          // Migration 037 — installer-configurable visit length + travel buffer
          meeting_duration_min?: number;
          travel_buffer_min?: number;
          // Migration 039 — F2 installer claim binding
          user_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["installers"]["Insert"]>;
        Relationships: [];
      };
      installer_leads: {
        Row: {
          id: string;
          homeowner_lead_id: string | null;
          contact_email: string;
          contact_name: string | null;
          contact_phone: string | null;
          preferred_contact_method: "email" | "phone" | "whatsapp" | "any" | null;
          preferred_contact_window: string | null;
          notes: string | null;
          installer_id: number;
          wants_heat_pump: boolean;
          wants_solar: boolean;
          wants_battery: boolean;
          property_address: string | null;
          property_postcode: string | null;
          property_uprn: string | null;
          property_latitude: number | null;
          property_longitude: number | null;
          analysis_snapshot: Json | null;
          status:
            | "new"
            | "sent_to_installer"
            | "installer_acknowledged"
            | "visit_booked"
            | "visit_completed"
            | "closed_won"
            | "closed_lost"
            | "cancelled";
          installer_notified_at: string | null;
          installer_acknowledged_at: string | null;
          visit_booked_for: string | null;
          stripe_charge_id: string | null;
          charge_amount_pence: number | null;
          charged_at: string | null;
          // Migration 029 — notification + acknowledge tracking
          notification_status:
            | "pending"
            | "sent"
            | "installer_only"
            | "homeowner_only"
            | "failed"
            | "skipped";
          notification_error: string | null;
          notification_attempted_at: string | null;
          installer_email_id: string | null;
          homeowner_email_id: string | null;
          acknowledge_token: string | null;
          acknowledge_clicked_at: string | null;
          // Migration 044 — C4 auto-release + reminder
          installer_reminder_sent_at: string | null;
          auto_released_at: string | null;
          // Migration 045 — installer report URL minted at accept time
          installer_report_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          homeowner_lead_id?: string | null;
          contact_email: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          preferred_contact_method?: "email" | "phone" | "whatsapp" | "any" | null;
          preferred_contact_window?: string | null;
          notes?: string | null;
          installer_id: number;
          wants_heat_pump?: boolean;
          wants_solar?: boolean;
          wants_battery?: boolean;
          property_address?: string | null;
          property_postcode?: string | null;
          property_uprn?: string | null;
          property_latitude?: number | null;
          property_longitude?: number | null;
          analysis_snapshot?: Json | null;
          status?:
            | "new"
            | "sent_to_installer"
            | "installer_acknowledged"
            | "visit_booked"
            | "visit_completed"
            | "closed_won"
            | "closed_lost"
            | "cancelled";
          installer_notified_at?: string | null;
          installer_acknowledged_at?: string | null;
          visit_booked_for?: string | null;
          stripe_charge_id?: string | null;
          charge_amount_pence?: number | null;
          charged_at?: string | null;
          notification_status?:
            | "pending"
            | "sent"
            | "installer_only"
            | "homeowner_only"
            | "failed"
            | "skipped";
          notification_error?: string | null;
          notification_attempted_at?: string | null;
          installer_email_id?: string | null;
          homeowner_email_id?: string | null;
          acknowledge_token?: string | null;
          acknowledge_clicked_at?: string | null;
          installer_reminder_sent_at?: string | null;
          auto_released_at?: string | null;
          installer_report_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["installer_leads"]["Insert"]>;
        Relationships: [];
      };
      report_tokens: {
        Row: {
          id: string;
          token: string;
          homeowner_lead_id: string | null;
          recipient_email: string;
          forwarded_by_email: string | null;
          kind: "self" | "forward";
          analysis_snapshot: Json;
          property_address: string | null;
          property_postcode: string | null;
          property_uprn: string | null;
          property_latitude: number | null;
          property_longitude: number | null;
          created_at: string;
          expires_at: string;
          first_viewed_at: string | null;
          last_viewed_at: string | null;
          view_count: number;
          email_message_id: string | null;
        };
        Insert: {
          id?: string;
          token: string;
          homeowner_lead_id?: string | null;
          recipient_email: string;
          forwarded_by_email?: string | null;
          kind: "self" | "forward";
          analysis_snapshot: Json;
          property_address?: string | null;
          property_postcode?: string | null;
          property_uprn?: string | null;
          property_latitude?: number | null;
          property_longitude?: number | null;
          created_at?: string;
          expires_at: string;
          first_viewed_at?: string | null;
          last_viewed_at?: string | null;
          view_count?: number;
          email_message_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["report_tokens"]["Insert"]>;
        Relationships: [];
      };
      // Migration 032 — installer booking foundations
      installer_availability: {
        Row: {
          id: string;
          installer_id: number;
          // 0=Sun, 1=Mon, ..., 6=Sat (matches JS Date.getDay())
          day_of_week: number;
          // Wall-clock Europe/London — `time` columns serialise as 'HH:MM:SS'
          start_time: string;
          end_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          installer_id: number;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["installer_availability"]["Insert"]>;
        Relationships: [];
      };
      installer_auto_recharge_attempts: {
        Row: {
          id: string;
          user_id: string | null;
          installer_id: number | null;
          pack_id: string;
          pack_credits: number;
          price_pence: number;
          status: "succeeded" | "requires_action" | "failed";
          stripe_payment_intent_id: string | null;
          failure_code: string | null;
          failure_message: string | null;
          balance_at_trigger: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          installer_id?: number | null;
          pack_id: string;
          pack_credits: number;
          price_pence: number;
          status: "succeeded" | "requires_action" | "failed";
          stripe_payment_intent_id?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          balance_at_trigger?: number | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["installer_auto_recharge_attempts"]["Insert"]
        >;
        Relationships: [];
      };
      installer_credit_purchases: {
        Row: {
          id: string;
          user_id: string | null;
          installer_id: number | null;
          pack_credits: number;
          price_pence: number;
          currency: string;
          // Nullable from Migration 042: off-session auto-recharges
          // don't go through Checkout, so no session id.
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_receipt_url: string | null;
          status: "completed" | "refunded";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          installer_id?: number | null;
          pack_credits: number;
          price_pence: number;
          currency?: string;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_receipt_url?: string | null;
          status?: "completed" | "refunded";
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["installer_credit_purchases"]["Insert"]
        >;
        Relationships: [];
      };
      installer_signup_requests: {
        Row: {
          id: string;
          status: "pending" | "approved" | "rejected";
          company_number: string | null;
          company_name: string;
          ch_address: string | null;
          ch_incorporation_date: string | null;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          bus_registered: boolean;
          cap_heat_pump: boolean;
          cap_solar_pv: boolean;
          cap_battery_storage: boolean;
          certification_body: string | null;
          certification_number: string | null;
          certification_pending: boolean;
          notes: string | null;
          request_ip_hash: string | null;
          request_user_agent: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          admin_notes: string | null;
          approved_installer_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: "pending" | "approved" | "rejected";
          company_number?: string | null;
          company_name: string;
          ch_address?: string | null;
          ch_incorporation_date?: string | null;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          bus_registered?: boolean;
          cap_heat_pump?: boolean;
          cap_solar_pv?: boolean;
          cap_battery_storage?: boolean;
          certification_body?: string | null;
          certification_number?: string | null;
          certification_pending?: boolean;
          notes?: string | null;
          request_ip_hash?: string | null;
          request_user_agent?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          admin_notes?: string | null;
          approved_installer_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["installer_signup_requests"]["Insert"]
        >;
        Relationships: [];
      };
      installer_meetings: {
        Row: {
          id: string;
          installer_id: number;
          installer_lead_id: string | null;
          homeowner_lead_id: string | null;
          // Absolute UTC instant the meeting starts
          scheduled_at: string;
          duration_min: number;
          travel_buffer_min: number;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          notes: string | null;
          google_event_id: string | null;
          google_installer_event_id: string | null;
          google_calendar_id: string | null;
          invite_sent_at: string | null;
          status: "pending" | "booked" | "cancelled" | "completed" | "no_show";
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          installer_id: number;
          installer_lead_id?: string | null;
          homeowner_lead_id?: string | null;
          scheduled_at: string;
          duration_min?: number;
          travel_buffer_min?: number;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          notes?: string | null;
          google_event_id?: string | null;
          google_installer_event_id?: string | null;
          google_calendar_id?: string | null;
          invite_sent_at?: string | null;
          status?: "pending" | "booked" | "cancelled" | "completed" | "no_show";
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["installer_meetings"]["Insert"]>;
        Relationships: [];
      };
      installer_proposals: {
        Row: {
          id: string;
          installer_id: number;
          installer_lead_id: string;
          homeowner_lead_id: string | null;
          status: "draft" | "sent" | "accepted" | "declined";
          line_items: Json;
          cover_message: string | null;
          vat_rate_bps: number;
          subtotal_pence: number;
          vat_pence: number;
          total_pence: number;
          homeowner_token: string;
          sent_at: string | null;
          viewed_at: string | null;
          accepted_at: string | null;
          declined_at: string | null;
          decline_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          installer_id: number;
          installer_lead_id: string;
          homeowner_lead_id?: string | null;
          status?: "draft" | "sent" | "accepted" | "declined";
          line_items?: Json;
          cover_message?: string | null;
          vat_rate_bps?: number;
          subtotal_pence?: number;
          vat_pence?: number;
          total_pence?: number;
          homeowner_token: string;
          sent_at?: string | null;
          viewed_at?: string | null;
          accepted_at?: string | null;
          declined_at?: string | null;
          decline_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["installer_proposals"]["Insert"]>;
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
