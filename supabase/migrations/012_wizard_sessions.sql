-- Track wizard journey progress and costs for incomplete sessions
ALTER TABLE public.lead_impressions
  ADD COLUMN IF NOT EXISTS last_step text,
  ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS extraction_cost numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_cost numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_id uuid REFERENCES public.verifications(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
