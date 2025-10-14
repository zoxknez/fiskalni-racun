-- Create receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  pib TEXT,
  date DATE NOT NULL,
  time TIME,
  amount DECIMAL(10, 2) NOT NULL,
  vat DECIMAL(10, 2),
  category TEXT,
  notes TEXT,
  qr_url TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for receipts
CREATE POLICY "Users can view their own receipts"
  ON public.receipts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts"
  ON public.receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts"
  ON public.receipts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts"
  ON public.receipts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for receipts
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON public.receipts(category);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor ON public.receipts(vendor);

-- Create devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  category TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  warranty_duration INTEGER NOT NULL, -- in months
  warranty_expires DATE NOT NULL,
  warranty_terms TEXT,
  service_name TEXT,
  service_address TEXT,
  service_phone TEXT,
  service_hours TEXT,
  reminders JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Create policies for devices
CREATE POLICY "Users can view their own devices"
  ON public.devices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
  ON public.devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
  ON public.devices
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
  ON public.devices
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for devices
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_warranty_expires ON public.devices(warranty_expires);
CREATE INDEX IF NOT EXISTS idx_devices_category ON public.devices(category);
CREATE INDEX IF NOT EXISTS idx_devices_brand ON public.devices(brand);

-- Create updated_at triggers
CREATE TRIGGER on_receipts_updated
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_devices_updated
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
