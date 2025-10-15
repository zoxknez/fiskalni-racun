-- Enable Realtime for receipts and devices tables
-- This allows real-time synchronization between Web and Mobile devices

-- Enable Realtime for receipts table
ALTER PUBLICATION supabase_realtime ADD TABLE receipts;

-- Enable Realtime for devices table
ALTER PUBLICATION supabase_realtime ADD TABLE devices;

-- Add RLS policies for receipts (if not exists)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own receipts"
  ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own receipts"
  ON receipts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own receipts"
  ON receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for devices (if not exists)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own devices"
  ON devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own devices"
  ON devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own devices"
  ON devices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own devices"
  ON devices FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_updated_at ON receipts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_warranty_expiry ON devices(warranty_expiry);
CREATE INDEX IF NOT EXISTS idx_devices_updated_at ON devices(updated_at DESC);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Realtime enabled for receipts and devices tables!';
  RAISE NOTICE 'RLS policies created for data security.';
  RAISE NOTICE 'Indexes created for performance optimization.';
END $$;
