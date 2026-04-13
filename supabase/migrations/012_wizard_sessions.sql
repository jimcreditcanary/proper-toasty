-- Create lead_impressions if it doesn't exist (may not have been created by migration 008)
CREATE TABLE IF NOT EXISTS public.lead_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lead_impressions ENABLE ROW LEVEL SECURITY;

-- Track wizard journey progress and costs for incomplete sessions
ALTER TABLE public.lead_impressions
  ADD COLUMN IF NOT EXISTS last_step text,
  ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS extraction_cost numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_cost numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_id uuid REFERENCES public.verifications(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
