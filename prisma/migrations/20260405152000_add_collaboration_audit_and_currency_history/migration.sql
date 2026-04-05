CREATE TABLE IF NOT EXISTS collaboration_audit_event (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES "Household"(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  target_user_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collab_audit_household_created
  ON collaboration_audit_event (household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collab_audit_actor_created
  ON collaboration_audit_event (actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS currency_conversion_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  amount_from DOUBLE PRECISION NOT NULL,
  amount_to DOUBLE PRECISION NOT NULL,
  rate_used DOUBLE PRECISION NOT NULL,
  locked_rate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_currency_history_user_created
  ON currency_conversion_history (user_id, created_at DESC);
