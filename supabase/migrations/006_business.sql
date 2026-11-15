-- ============================================================
-- MIGRATION 006: Business Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN ('rent', 'electricity', 'gas', 'salary', 'maintenance', 'ingredients', 'other')),
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  expense_date    DATE NOT NULL,
  reference       TEXT,
  recorded_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_expenses_shop ON expenses(shop_id, expense_date DESC);

CREATE TABLE IF NOT EXISTS daily_closings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  closing_date    DATE NOT NULL,
  cash_sales      NUMERIC(10,2) NOT NULL DEFAULT 0,
  upi_sales       NUMERIC(10,2) NOT NULL DEFAULT 0,
  card_sales      NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sales     NUMERIC(10,2) NOT NULL DEFAULT 0,
  expected_cash   NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_cash     NUMERIC(10,2) NOT NULL DEFAULT 0,
  difference      NUMERIC(10,2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
  remarks         TEXT,
  submitted_by    UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by     UUID REFERENCES auth.users(id),
  status          TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'discrepancy')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, closing_date)
);

CREATE TRIGGER daily_closings_updated_at
  BEFORE UPDATE ON daily_closings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('low_stock', 'critical_stock', 'out_of_stock', 'daily_closing', 'discrepancy', 'system')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  related_id      UUID,
  related_type    TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_shop ON notifications(shop_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  action_type     TEXT NOT NULL,
  table_name      TEXT NOT NULL,
  record_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_shop ON audit_logs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, record_id);
