-- Add purchase category and check tier fields for the new wizard flow
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS purchase_category text;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS check_tier text;
