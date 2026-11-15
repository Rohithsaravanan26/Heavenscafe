-- ============================================================
-- MIGRATION 005: Billing Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  invoice_no          TEXT NOT NULL,
  manager_id          UUID NOT NULL REFERENCES auth.users(id),
  customer_name       TEXT,
  customer_phone      TEXT,
  subtotal            NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  discount_reason     TEXT,
  tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status              TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
  idempotency_key     TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, invoice_no),
  UNIQUE(idempotency_key)
);

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sales_shop ON sales(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_manager ON sales(manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(shop_id, status);

CREATE TABLE IF NOT EXISTS sale_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  variant_name    TEXT,
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  subtotal        NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  method          TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card', 'other')),
  amount          NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  amount_tendered NUMERIC(10,2),
  change_amount   NUMERIC(10,2),
  reference       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(sale_id, method);

CREATE TABLE IF NOT EXISTS refunds (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  reason          TEXT NOT NULL,
  total_amount    NUMERIC(10,2) NOT NULL,
  processed_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_id       UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  sale_item_id    UUID NOT NULL REFERENCES sale_items(id),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  amount          NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS receipt_print_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  printed_by      UUID NOT NULL REFERENCES auth.users(id),
  print_method    TEXT NOT NULL CHECK (print_method IN ('browser', 'qz_tray', 'pdf')),
  is_duplicate    BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_logs_sale ON receipt_print_logs(sale_id, created_at DESC);
