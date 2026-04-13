-- Add enterprise flag to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS enterprise boolean DEFAULT false;

-- Enterprise subscriptions
CREATE TABLE IF NOT EXISTS public.enterprise_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  stripe_subscription_id text UNIQUE,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly_block', 'min_balance')),
  monthly_credits int NOT NULL DEFAULT 0,
  min_balance int NOT NULL DEFAULT 0,
  price_per_credit numeric(10,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.enterprise_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.enterprise_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Enterprise invoices
CREATE TABLE IF NOT EXISTS public.enterprise_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  subscription_id uuid REFERENCES public.enterprise_subscriptions(id),
  stripe_invoice_id text UNIQUE,
  amount int NOT NULL DEFAULT 0,
  credits int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('paid', 'open', 'void')),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.enterprise_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.enterprise_invoices FOR SELECT
  USING (auth.uid() = user_id);
