create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  flow_type text, -- 'marketplace' | 'invoice' | 'manual'
  marketplace_url text,
  marketplace_item_title text,
  marketplace_listed_price numeric,
  valuation_min numeric,
  valuation_max numeric,
  valuation_summary text,
  invoice_file_path text,
  payee_type text, -- 'personal' | 'business'
  payee_name text,
  company_name_input text,
  sort_code text,
  account_number text,
  vat_number_input text,
  invoice_amount numeric,
  extracted_company_name text,
  extracted_vat_number text,
  extracted_invoice_amount numeric,
  extracted_sort_code text,
  extracted_account_number text,
  companies_house_result jsonb,
  companies_house_name text,
  companies_house_number text,
  companies_house_status text,
  companies_house_incorporated_date date,
  companies_house_accounts_date date,
  companies_house_accounts_overdue boolean,
  hmrc_vat_result jsonb,
  vat_api_name text,
  bank_verify_result jsonb,
  cop_result text,
  cop_reason text,
  overall_risk text,
  status text default 'pending'
);

create index if not exists verifications_user_id_idx on public.verifications(user_id);
alter table public.verifications enable row level security;

create policy "Users can view own verifications" on public.verifications for select using (auth.uid() = user_id);
create policy "Service role can insert verifications" on public.verifications for insert with check (true);
create policy "Service role can update verifications" on public.verifications for update using (true);
