-- Create household_bills table for utilities and recurring expenses
CREATE TABLE IF NOT EXISTS public.household_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bill_type TEXT NOT NULL, -- electricity, water, gas, internet, phone, rent, heating, etc.
  provider TEXT NOT NULL, -- EPS, Beogradski vodovod, SBB, Telenor, etc.
  account_number TEXT, -- Broj korisnika / računa
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'RSD',
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  status TEXT DEFAULT 'unpaid', -- unpaid, paid, overdue
  consumption JSONB, -- { "amount": 150, "unit": "kWh" } or { "amount": 10, "unit": "m³" }
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.household_bills ENABLE ROW LEVEL SECURITY;

-- Create policies for household_bills
CREATE POLICY "Users can view their own bills"
  ON public.household_bills
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bills"
  ON public.household_bills
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
  ON public.household_bills
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
  ON public.household_bills
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for household_bills
CREATE INDEX IF NOT EXISTS idx_household_bills_user_id ON public.household_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_household_bills_bill_type ON public.household_bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_household_bills_due_date ON public.household_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_household_bills_status ON public.household_bills(status);
CREATE INDEX IF NOT EXISTS idx_household_bills_billing_period ON public.household_bills(billing_period_start, billing_period_end);

-- Create updated_at trigger
CREATE TRIGGER on_household_bills_updated
  BEFORE UPDATE ON public.household_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create view for statistics
CREATE OR REPLACE VIEW public.household_bills_stats AS
SELECT
  user_id,
  bill_type,
  DATE_TRUNC('month', billing_period_start) as month,
  COUNT(*) as bill_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM public.household_bills
GROUP BY user_id, bill_type, DATE_TRUNC('month', billing_period_start);
