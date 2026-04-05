CREATE TABLE IF NOT EXISTS collaboration_settlement_payment (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES "Household"(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  amount_usd DOUBLE PRECISION NOT NULL CHECK (amount_usd > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  due_date TIMESTAMP(3) NOT NULL,
  last_reminder_at TIMESTAMP(3),
  reminder_count INTEGER NOT NULL DEFAULT 0,
  paid_at TIMESTAMP(3),
  note TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlement_payment_household_status_due
  ON collaboration_settlement_payment (household_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_settlement_payment_from_user_status
  ON collaboration_settlement_payment (from_user_id, status);
