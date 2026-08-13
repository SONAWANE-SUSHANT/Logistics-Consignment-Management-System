-- Freight Bill payment tracking migration
-- Run once against the existing PostgreSQL database. Safe to re-run (uses IF NOT EXISTS guards).

BEGIN;

-- 1. Running paid amount on the bill itself (pending amount is derived at read time
--    as grand_total - paid_amount, so no column is needed for it).
ALTER TABLE freight_bills
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE freight_bills
  ALTER COLUMN status SET DEFAULT 'Unpaid';

-- 2. Normalize any existing status values into the new Unpaid / Partially Paid / Paid
--    vocabulary. Bills already marked 'Paid' get their paid_amount backfilled to the
--    grand total so the numbers stay consistent.
UPDATE freight_bills
  SET paid_amount = grand_total
  WHERE status = 'Paid' AND paid_amount < grand_total;

UPDATE freight_bills
  SET status = 'Unpaid'
  WHERE status IS NULL OR status NOT IN ('Unpaid', 'Partially Paid', 'Paid');

UPDATE freight_bills
  SET status = CASE
    WHEN paid_amount >= grand_total AND grand_total > 0 THEN 'Paid'
    WHEN paid_amount > 0 THEN 'Partially Paid'
    ELSE 'Unpaid'
  END;

-- 3. Payment history table — one row per recorded payment against a bill.
CREATE TABLE IF NOT EXISTS freight_bill_payments (
  id SERIAL PRIMARY KEY,
  freight_bill_id INTEGER NOT NULL REFERENCES freight_bills(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  mode VARCHAR(50),
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_freight_bill_payments_bill_id
  ON freight_bill_payments (freight_bill_id);

COMMIT;