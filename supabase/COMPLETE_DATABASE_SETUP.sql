-- ============================================================
-- FILE: supabase\migrations\001_extensions.sql
-- ============================================================

-- ============================================================
-- MIGRATION 001: PostgreSQL Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- FILE: supabase\migrations\002_core.sql
-- ============================================================

-- ============================================================
-- MIGRATION 002: Core Tables (shops, profiles, settings)
-- ============================================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  gst_number      TEXT,
  logo_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  role            TEXT NOT NULL CHECK (role IN ('ADMIN', 'SHOP_MANAGER')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Role permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role            TEXT NOT NULL CHECK (role IN ('ADMIN', 'SHOP_MANAGER')),
  permission      TEXT NOT NULL,
  is_allowed      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(role, permission)
);

-- Shop settings
CREATE TABLE IF NOT EXISTS shop_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  invoice_prefix  TEXT NOT NULL DEFAULT 'HCF',
  tax_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  tax_label       TEXT NOT NULL DEFAULT 'GST',
  currency_symbol TEXT NOT NULL DEFAULT 'â‚¹',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shop_settings_updated_at
  BEFORE UPDATE ON shop_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Printer settings
CREATE TABLE IF NOT EXISTS printer_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  printer_name    TEXT,
  connection_type TEXT NOT NULL DEFAULT 'browser' CHECK (connection_type IN ('browser', 'qz_tray', 'network')),
  paper_width     INTEGER NOT NULL DEFAULT 80 CHECK (paper_width IN (58, 80)),
  printer_ip      TEXT,
  printer_port    INTEGER,
  header_lines    JSONB NOT NULL DEFAULT '[]',
  footer_lines    JSONB NOT NULL DEFAULT '["Thank you for visiting!", "Visit us again!"]',
  show_tax        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER printer_settings_updated_at
  BEFORE UPDATE ON printer_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- FILE: supabase\migrations\003_menu.sql
-- ============================================================

-- ============================================================
-- MIGRATION 003: Menu Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

CREATE TRIGGER menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_menu_categories_shop ON menu_categories(shop_id, display_order);

CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  description     TEXT,
  base_price      NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  track_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(shop_id, is_active, is_available);

CREATE TABLE IF NOT EXISTS product_price_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price       NUMERIC(10,2) NOT NULL,
  new_price       NUMERIC(10,2) NOT NULL,
  changed_by      UUID NOT NULL REFERENCES auth.users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason          TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS product_variants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  price_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_addons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  url             TEXT NOT NULL,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- FILE: supabase\migrations\004_inventory.sql
-- ============================================================

-- ============================================================
-- MIGRATION 004: Inventory Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ingredients (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id               UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  unit                  TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'pcs')),
  min_stock             NUMERIC(12,3) NOT NULL DEFAULT 0,
  current_stock         NUMERIC(12,3) NOT NULL DEFAULT 0,
  cost_per_unit         NUMERIC(10,2),
  preferred_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

CREATE TRIGGER ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ingredients_shop ON ingredients(shop_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_low_stock ON ingredients(shop_id, current_stock, min_stock);

CREATE TABLE IF NOT EXISTS recipes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS recipe_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity        NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  UNIQUE(recipe_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  reference_no    TEXT,
  received_by     UUID NOT NULL REFERENCES auth.users(id),
  total_cost      NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_shop ON purchase_orders(shop_id, received_at DESC);

CREATE TABLE IF NOT EXISTS purchase_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id     UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity          NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_cost         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost        NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale_deduction', 'wastage', 'adjustment', 'opening')),
  quantity        NUMERIC(12,3) NOT NULL,
  unit_cost       NUMERIC(10,2),
  reference_id    UUID,
  reference_type  TEXT,
  reason          TEXT,
  stock_before    NUMERIC(12,3) NOT NULL,
  stock_after     NUMERIC(12,3) NOT NULL,
  performed_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_shop ON stock_movements(shop_id, created_at DESC);


-- ============================================================
-- FILE: supabase\migrations\005_billing.sql
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(shop_id, DATE(created_at));

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


-- ============================================================
-- FILE: supabase\migrations\006_business.sql
-- ============================================================

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


-- ============================================================
-- FILE: supabase\migrations\007_rls.sql
-- ============================================================

-- ============================================================
-- MIGRATION 007: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_print_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- â”€â”€ Helper Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION auth_shop_id()
RETURNS UUID
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid() AND is_active = TRUE
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = TRUE
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT auth_role() = 'ADMIN'
$$;

-- â”€â”€ SHOPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "shops_read" ON shops
  FOR SELECT USING (id = auth_shop_id());

CREATE POLICY "shops_admin_write" ON shops
  FOR ALL USING (id = auth_shop_id() AND is_admin());

-- â”€â”€ PROFILES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR (shop_id = auth_shop_id() AND is_admin())
  );

CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ SHOP SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "shop_settings_read" ON shop_settings
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "shop_settings_admin_write" ON shop_settings
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ PRINTER SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "printer_settings_all" ON printer_settings
  FOR ALL USING (shop_id = auth_shop_id());

-- â”€â”€ MENU CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "menu_categories_read" ON menu_categories
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "menu_categories_admin_write" ON menu_categories
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "products_read" ON products
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ PRODUCT PRICE HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "price_history_read" ON product_price_history
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "price_history_admin_insert" ON product_price_history
  FOR INSERT WITH CHECK (is_admin());

-- â”€â”€ PRODUCT VARIANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "product_variants_read" ON product_variants
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "product_variants_admin_write" ON product_variants
  FOR ALL USING (is_admin());

-- â”€â”€ PRODUCT ADDONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "product_addons_read" ON product_addons
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "product_addons_admin_write" ON product_addons
  FOR ALL USING (is_admin());

-- â”€â”€ PRODUCT IMAGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "product_images_read" ON product_images
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "product_images_admin_write" ON product_images
  FOR ALL USING (is_admin());

-- â”€â”€ SUPPLIERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "suppliers_read" ON suppliers
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "suppliers_admin_write" ON suppliers
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ INGREDIENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "ingredients_read" ON ingredients
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "ingredients_admin_write" ON ingredients
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ RECIPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "recipes_read" ON recipes
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "recipes_admin_write" ON recipes
  FOR ALL USING (is_admin());

CREATE POLICY "recipe_items_read" ON recipe_items
  FOR SELECT USING (
    recipe_id IN (
      SELECT r.id FROM recipes r
      JOIN products p ON r.product_id = p.id
      WHERE p.shop_id = auth_shop_id()
    )
  );

CREATE POLICY "recipe_items_admin_write" ON recipe_items
  FOR ALL USING (is_admin());

-- â”€â”€ PURCHASE ORDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "purchase_orders_read" ON purchase_orders
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "purchase_orders_insert" ON purchase_orders
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

CREATE POLICY "purchase_orders_admin_update" ON purchase_orders
  FOR UPDATE USING (shop_id = auth_shop_id() AND is_admin());

CREATE POLICY "purchase_items_read" ON purchase_items
  FOR SELECT USING (
    purchase_order_id IN (SELECT id FROM purchase_orders WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "purchase_items_insert" ON purchase_items
  FOR INSERT WITH CHECK (
    purchase_order_id IN (SELECT id FROM purchase_orders WHERE shop_id = auth_shop_id())
  );

-- â”€â”€ STOCK MOVEMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "stock_movements_read" ON stock_movements
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "stock_movements_insert" ON stock_movements
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

-- â”€â”€ SALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "sales_read" ON sales
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

CREATE POLICY "sales_admin_update" ON sales
  FOR UPDATE USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ SALE ITEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "sale_items_read" ON sale_items
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "sale_items_insert" ON sale_items
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

-- â”€â”€ PAYMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "payments_read" ON payments
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

-- â”€â”€ REFUNDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "refunds_read" ON refunds
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "refunds_admin_write" ON refunds
  FOR ALL USING (is_admin());

CREATE POLICY "refund_items_read" ON refund_items
  FOR SELECT USING (
    refund_id IN (
      SELECT r.id FROM refunds r
      JOIN sales s ON r.sale_id = s.id
      WHERE s.shop_id = auth_shop_id()
    )
  );

-- â”€â”€ PRINT LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "print_logs_read" ON receipt_print_logs
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "print_logs_insert" ON receipt_print_logs
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

-- â”€â”€ EXPENSES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "expenses_admin" ON expenses
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ DAILY CLOSINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "closings_read" ON daily_closings
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "closings_insert" ON daily_closings
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

CREATE POLICY "closings_admin_update" ON daily_closings
  FOR UPDATE USING (shop_id = auth_shop_id() AND is_admin());

-- â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "notifications_read" ON notifications
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (shop_id = auth_shop_id());

CREATE POLICY "notifications_admin_insert" ON notifications
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

-- â”€â”€ AUDIT LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT USING (shop_id = auth_shop_id() AND is_admin());

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

-- â”€â”€ ROLE PERMISSIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "role_permissions_read" ON role_permissions
  FOR SELECT USING (TRUE);

CREATE POLICY "role_permissions_admin_write" ON role_permissions
  FOR ALL USING (is_admin());


-- ============================================================
-- FILE: supabase\migrations\008_functions.sql
-- ============================================================

-- ============================================================
-- MIGRATION 008: PostgreSQL Stored Functions
-- ============================================================

-- Generate unique invoice number: HCF-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_invoice_no(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_prefix     TEXT;
  v_date       TEXT;
  v_seq        INTEGER;
  v_invoice_no TEXT;
BEGIN
  SELECT invoice_prefix INTO v_prefix
    FROM shop_settings WHERE shop_id = p_shop_id;

  v_prefix := COALESCE(v_prefix, 'HCF');
  v_date   := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COUNT(*) + 1 INTO v_seq
    FROM sales
    WHERE shop_id = p_shop_id
      AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;

  v_invoice_no := v_prefix || '-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_invoice_no;
END;
$$;

-- â”€â”€ Complete Sale (Atomic Transaction) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION complete_sale(
  p_shop_id         UUID,
  p_manager_id      UUID,
  p_idempotency_key TEXT,
  p_items           JSONB,
  p_subtotal        NUMERIC,
  p_discount_amount NUMERIC,
  p_discount_reason TEXT,
  p_tax_amount      NUMERIC,
  p_total_amount    NUMERIC,
  p_payment_method  TEXT,
  p_payment_amount  NUMERIC,
  p_amount_tendered NUMERIC DEFAULT NULL,
  p_change_amount   NUMERIC DEFAULT NULL,
  p_payment_ref     TEXT DEFAULT NULL,
  p_customer_name   TEXT DEFAULT NULL,
  p_customer_phone  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sale_id      UUID;
  v_invoice_no   TEXT;
  v_item         JSONB;
  v_product      RECORD;
  v_recipe       RECORD;
  v_ri           RECORD;
  v_stock_before NUMERIC;
BEGIN
  -- Idempotency check
  SELECT id, invoice_no INTO v_sale_id, v_invoice_no
    FROM sales WHERE idempotency_key = p_idempotency_key;

  IF v_sale_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'sale_id',    v_sale_id,
      'invoice_no', v_invoice_no,
      'duplicate',  TRUE
    );
  END IF;

  -- Generate invoice number
  v_invoice_no := generate_invoice_no(p_shop_id);

  -- Insert sale header
  INSERT INTO sales (
    shop_id, invoice_no, manager_id,
    customer_name, customer_phone,
    subtotal, discount_amount, discount_reason,
    tax_amount, total_amount,
    status, idempotency_key
  ) VALUES (
    p_shop_id, v_invoice_no, p_manager_id,
    p_customer_name, p_customer_phone,
    p_subtotal, p_discount_amount, p_discount_reason,
    p_tax_amount, p_total_amount,
    'completed', p_idempotency_key
  ) RETURNING id INTO v_sale_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Validate product
    SELECT id, base_price, is_available, is_active, track_inventory
      INTO v_product
      FROM products
      WHERE id = (v_item->>'product_id')::UUID;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product is archived: %', v_item->>'product_name';
    END IF;

    IF NOT v_product.is_available THEN
      RAISE EXCEPTION 'Product is unavailable: %', v_item->>'product_name';
    END IF;

    -- Insert sale item with price snapshot
    INSERT INTO sale_items (
      sale_id, product_id, product_name, variant_name,
      unit_price, quantity, subtotal
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      v_item->>'variant_name',
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC * (v_item->>'quantity')::INTEGER
    );

    -- Recipe-based inventory deduction
    IF v_product.track_inventory THEN
      SELECT * INTO v_recipe
        FROM recipes
        WHERE product_id = v_product.id AND is_active = TRUE;

      IF v_recipe.id IS NOT NULL THEN
        FOR v_ri IN
          SELECT ri.ingredient_id, ri.quantity AS recipe_qty, i.current_stock
            FROM recipe_items ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.recipe_id = v_recipe.id
        LOOP
          v_stock_before := v_ri.current_stock;

          UPDATE ingredients
            SET current_stock = current_stock -
              (v_ri.recipe_qty * (v_item->>'quantity')::INTEGER)
            WHERE id = v_ri.ingredient_id;

          INSERT INTO stock_movements (
            shop_id, ingredient_id, movement_type, quantity,
            reference_id, reference_type, reason,
            stock_before, stock_after, performed_by
          ) VALUES (
            p_shop_id, v_ri.ingredient_id, 'sale_deduction',
            -(v_ri.recipe_qty * (v_item->>'quantity')::INTEGER),
            v_sale_id, 'sale',
            'Auto-deducted by sale ' || v_invoice_no,
            v_stock_before,
            v_stock_before - (v_ri.recipe_qty * (v_item->>'quantity')::INTEGER),
            p_manager_id
          );
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  -- Insert payment
  INSERT INTO payments (
    sale_id, method, amount,
    amount_tendered, change_amount, reference
  ) VALUES (
    v_sale_id, p_payment_method, p_payment_amount,
    p_amount_tendered, p_change_amount, p_payment_ref
  );

  -- Trigger low-stock checks
  PERFORM check_low_stock_alerts(p_shop_id);

  -- Audit log
  INSERT INTO audit_logs (
    shop_id, user_id, action_type, table_name, record_id, new_value
  ) VALUES (
    p_shop_id, p_manager_id, 'SALE_COMPLETED', 'sales', v_sale_id,
    jsonb_build_object(
      'invoice_no',    v_invoice_no,
      'total_amount',  p_total_amount,
      'payment_method', p_payment_method
    )
  );

  RETURN jsonb_build_object(
    'sale_id',    v_sale_id,
    'invoice_no', v_invoice_no,
    'duplicate',  FALSE
  );
END;
$$;

-- â”€â”€ Low Stock Alert Generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION check_low_stock_alerts(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_ing   RECORD;
  v_type  TEXT;
  v_exists BOOLEAN;
BEGIN
  FOR v_ing IN
    SELECT id, name, current_stock, min_stock, unit
      FROM ingredients
      WHERE shop_id = p_shop_id AND is_active = TRUE
        AND current_stock <= min_stock
  LOOP
    IF v_ing.current_stock <= 0 THEN
      v_type := 'out_of_stock';
    ELSIF v_ing.current_stock <= v_ing.min_stock * 0.5 THEN
      v_type := 'critical_stock';
    ELSE
      v_type := 'low_stock';
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM notifications
        WHERE shop_id = p_shop_id
          AND type = v_type
          AND related_id = v_ing.id
          AND is_read = FALSE
          AND created_at > NOW() - INTERVAL '24 hours'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO notifications (
        shop_id, type, title, message, related_id, related_type
      ) VALUES (
        p_shop_id,
        v_type,
        CASE v_type
          WHEN 'out_of_stock'   THEN 'Out of Stock: ' || v_ing.name
          WHEN 'critical_stock' THEN 'Critical Stock: ' || v_ing.name
          ELSE                       'Low Stock: ' || v_ing.name
        END,
        v_ing.name || ' is at ' || v_ing.current_stock || ' ' || v_ing.unit ||
          ' (minimum: ' || v_ing.min_stock || ' ' || v_ing.unit || ')',
        v_ing.id,
        'ingredient'
      );
    END IF;
  END LOOP;
END;
$$;

-- â”€â”€ Dashboard KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_today_sales    NUMERIC := 0;
  v_today_bills    INTEGER := 0;
  v_month_sales    NUMERIC := 0;
  v_month_bills    INTEGER := 0;
  v_avg_order      NUMERIC := 0;
  v_items_today    INTEGER := 0;
  v_low_stock      INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
    INTO v_today_sales, v_today_bills
    FROM sales
    WHERE shop_id = p_shop_id
      AND DATE(created_at) = CURRENT_DATE
      AND status = 'completed';

  SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
    INTO v_month_sales, v_month_bills
    FROM sales
    WHERE shop_id = p_shop_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      AND status = 'completed';

  IF v_today_bills > 0 THEN
    v_avg_order := v_today_sales / v_today_bills;
  END IF;

  SELECT COALESCE(SUM(si.quantity), 0) INTO v_items_today
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.shop_id = p_shop_id
      AND DATE(s.created_at) = CURRENT_DATE
      AND s.status = 'completed';

  SELECT COUNT(*) INTO v_low_stock
    FROM ingredients
    WHERE shop_id = p_shop_id
      AND is_active = TRUE
      AND current_stock <= min_stock;

  RETURN jsonb_build_object(
    'today_sales',      v_today_sales,
    'today_bills',      v_today_bills,
    'month_sales',      v_month_sales,
    'month_bills',      v_month_bills,
    'avg_order_value',  ROUND(v_avg_order, 2),
    'items_today',      v_items_today,
    'low_stock_count',  v_low_stock
  );
END;
$$;

-- â”€â”€ Receive Stock (atomic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION receive_stock(
  p_shop_id      UUID,
  p_manager_id   UUID,
  p_supplier_id  UUID,
  p_reference_no TEXT,
  p_notes        TEXT,
  p_items        JSONB  -- [{ingredient_id, quantity, unit_cost}]
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_po_id       UUID;
  v_total_cost  NUMERIC := 0;
  v_item        JSONB;
  v_stock_before NUMERIC;
  v_ingredient  RECORD;
BEGIN
  -- Create purchase order
  INSERT INTO purchase_orders (
    shop_id, supplier_id, reference_no, received_by, notes
  ) VALUES (
    p_shop_id, p_supplier_id, p_reference_no, p_manager_id, p_notes
  ) RETURNING id INTO v_po_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, current_stock, name INTO v_ingredient
      FROM ingredients
      WHERE id = (v_item->>'ingredient_id')::UUID AND shop_id = p_shop_id;

    IF v_ingredient.id IS NULL THEN
      RAISE EXCEPTION 'Ingredient not found: %', v_item->>'ingredient_id';
    END IF;

    v_stock_before := v_ingredient.current_stock;

    -- Insert purchase item
    INSERT INTO purchase_items (
      purchase_order_id, ingredient_id, quantity, unit_cost, total_cost
    ) VALUES (
      v_po_id,
      (v_item->>'ingredient_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_cost')::NUMERIC,
      (v_item->>'quantity')::NUMERIC * (v_item->>'unit_cost')::NUMERIC
    );

    v_total_cost := v_total_cost + ((v_item->>'quantity')::NUMERIC * (v_item->>'unit_cost')::NUMERIC);

    -- Update ingredient stock
    UPDATE ingredients
      SET current_stock = current_stock + (v_item->>'quantity')::NUMERIC,
          cost_per_unit = (v_item->>'unit_cost')::NUMERIC
      WHERE id = (v_item->>'ingredient_id')::UUID;

    -- Record stock movement
    INSERT INTO stock_movements (
      shop_id, ingredient_id, movement_type, quantity, unit_cost,
      reference_id, reference_type, reason,
      stock_before, stock_after, performed_by
    ) VALUES (
      p_shop_id,
      (v_item->>'ingredient_id')::UUID,
      'purchase',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_cost')::NUMERIC,
      v_po_id, 'purchase_order',
      'Stock received',
      v_stock_before,
      v_stock_before + (v_item->>'quantity')::NUMERIC,
      p_manager_id
    );
  END LOOP;

  -- Update total cost on purchase order
  UPDATE purchase_orders SET total_cost = v_total_cost WHERE id = v_po_id;

  -- Audit
  INSERT INTO audit_logs (shop_id, user_id, action_type, table_name, record_id, new_value)
  VALUES (
    p_shop_id, p_manager_id, 'STOCK_RECEIVED', 'purchase_orders', v_po_id,
    jsonb_build_object('total_cost', v_total_cost, 'items_count', jsonb_array_length(p_items))
  );

  RETURN jsonb_build_object('purchase_order_id', v_po_id, 'total_cost', v_total_cost);
END;
$$;

-- â”€â”€ Record Wastage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION record_wastage(
  p_shop_id       UUID,
  p_manager_id    UUID,
  p_ingredient_id UUID,
  p_quantity      NUMERIC,
  p_reason        TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_stock_before NUMERIC;
BEGIN
  SELECT current_stock INTO v_stock_before
    FROM ingredients WHERE id = p_ingredient_id AND shop_id = p_shop_id;

  IF v_stock_before IS NULL THEN
    RAISE EXCEPTION 'Ingredient not found';
  END IF;

  IF v_stock_before < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for wastage. Available: %, Requested: %',
      v_stock_before, p_quantity;
  END IF;

  UPDATE ingredients
    SET current_stock = current_stock - p_quantity
    WHERE id = p_ingredient_id;

  INSERT INTO stock_movements (
    shop_id, ingredient_id, movement_type, quantity,
    reason, stock_before, stock_after, performed_by
  ) VALUES (
    p_shop_id, p_ingredient_id, 'wastage', -p_quantity,
    p_reason,
    v_stock_before, v_stock_before - p_quantity,
    p_manager_id
  );

  INSERT INTO audit_logs (shop_id, user_id, action_type, table_name, new_value)
  VALUES (
    p_shop_id, p_manager_id, 'WASTAGE_RECORDED', 'stock_movements',
    jsonb_build_object(
      'ingredient_id', p_ingredient_id,
      'quantity', p_quantity,
      'reason', p_reason
    )
  );

  PERFORM check_low_stock_alerts(p_shop_id);

  RETURN jsonb_build_object('success', TRUE, 'stock_after', v_stock_before - p_quantity);
END;
$$;


-- ============================================================
-- FILE: supabase\migrations\009_views.sql
-- ============================================================

-- ============================================================
-- MIGRATION 009: Analytics Views
-- ============================================================

-- Daily sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  s.shop_id,
  DATE(s.created_at) AS sale_date,
  COUNT(*)           AS total_bills,
  SUM(s.total_amount)   AS total_revenue,
  SUM(s.discount_amount) AS total_discounts,
  SUM(s.tax_amount)     AS total_tax,
  AVG(s.total_amount)   AS avg_order_value,
  COALESCE(SUM(si_counts.items_sold), 0) AS total_items_sold
FROM sales s
LEFT JOIN (
  SELECT sale_id, SUM(quantity) AS items_sold
  FROM sale_items GROUP BY sale_id
) si_counts ON si_counts.sale_id = s.id
WHERE s.status = 'completed'
GROUP BY s.shop_id, DATE(s.created_at);

-- Monthly sales summary
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT
  s.shop_id,
  DATE_TRUNC('month', s.created_at) AS sale_month,
  COUNT(*)           AS total_bills,
  SUM(s.total_amount)   AS total_revenue,
  SUM(s.discount_amount) AS total_discounts,
  SUM(s.tax_amount)     AS total_tax,
  AVG(s.total_amount)   AS avg_order_value
FROM sales s
WHERE s.status = 'completed'
GROUP BY s.shop_id, DATE_TRUNC('month', s.created_at);

-- Product sales performance
CREATE OR REPLACE VIEW product_sales_performance AS
SELECT
  s.shop_id,
  si.product_id,
  si.product_name,
  SUM(si.quantity)        AS total_quantity,
  SUM(si.subtotal)        AS total_revenue,
  COUNT(DISTINCT si.sale_id) AS order_count,
  MIN(s.created_at)       AS first_sale,
  MAX(s.created_at)       AS last_sale
FROM sale_items si
JOIN sales s ON si.sale_id = s.id
WHERE s.status = 'completed'
GROUP BY s.shop_id, si.product_id, si.product_name;

-- Payment method summary
CREATE OR REPLACE VIEW payment_method_summary AS
SELECT
  s.shop_id,
  DATE(s.created_at) AS sale_date,
  p.method,
  COUNT(*)            AS transaction_count,
  SUM(p.amount)       AS total_amount
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.status = 'completed'
GROUP BY s.shop_id, DATE(s.created_at), p.method;

-- Hourly sales heatmap
CREATE OR REPLACE VIEW hourly_sales_heatmap AS
SELECT
  s.shop_id,
  EXTRACT(HOUR FROM s.created_at) AS hour_of_day,
  EXTRACT(DOW FROM s.created_at)  AS day_of_week,
  COUNT(*)           AS total_bills,
  SUM(s.total_amount) AS total_revenue
FROM sales s
WHERE s.status = 'completed'
GROUP BY s.shop_id,
  EXTRACT(HOUR FROM s.created_at),
  EXTRACT(DOW FROM s.created_at);

-- Inventory status view
CREATE OR REPLACE VIEW inventory_status AS
SELECT
  i.shop_id,
  i.id,
  i.name,
  i.unit,
  i.current_stock,
  i.min_stock,
  i.cost_per_unit,
  CASE
    WHEN i.current_stock <= 0              THEN 'out_of_stock'
    WHEN i.current_stock <= i.min_stock * 0.5 THEN 'critical'
    WHEN i.current_stock <= i.min_stock    THEN 'low'
    ELSE                                        'ok'
  END AS stock_status,
  s.name AS preferred_supplier
FROM ingredients i
LEFT JOIN suppliers s ON i.preferred_supplier_id = s.id
WHERE i.is_active = TRUE;

-- Full sale detail view (for receipts)
CREATE OR REPLACE VIEW sale_detail AS
SELECT
  s.*,
  p.full_name     AS manager_name,
  sh.name         AS shop_name,
  sh.address      AS shop_address,
  sh.phone        AS shop_phone,
  ss.invoice_prefix,
  ss.tax_enabled,
  ss.tax_rate,
  ss.tax_label,
  ss.currency_symbol,
  pay.method      AS payment_method,
  pay.amount_tendered,
  pay.change_amount,
  pay.reference   AS payment_reference
FROM sales s
JOIN profiles p  ON s.manager_id = p.id
JOIN shops sh    ON s.shop_id = sh.id
JOIN shop_settings ss ON s.shop_id = ss.shop_id
LEFT JOIN payments pay ON pay.sale_id = s.id;


-- ============================================================
-- FILE: supabase\seed.sql
-- ============================================================

-- ============================================================
-- HEAVEN'S CAFE MENU SEED
-- Imports all 43 products across 13 categories
-- IDEMPOTENT: safe to run multiple times (ON CONFLICT DO NOTHING)
-- ============================================================

DO $$
DECLARE
  v_shop_id       UUID;
  v_cat_hot       UUID;
  v_cat_savouries UUID;
  v_cat_fries     UUID;
  v_cat_breads    UUID;
  v_cat_sandwich  UUID;
  v_cat_rolls     UUID;
  v_cat_chicken   UUID;
  v_cat_momos     UUID;
  v_cat_seafood   UUID;
  v_cat_maggie    UUID;
  v_cat_pasta     UUID;
  v_cat_burger    UUID;
  v_cat_mojito    UUID;
BEGIN

  -- â”€â”€ Create or find the shop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO shops (name)
    VALUES ('Heaven''s Cafe')
    ON CONFLICT DO NOTHING;

  SELECT id INTO v_shop_id FROM shops WHERE name = 'Heaven''s Cafe' LIMIT 1;

  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'Could not create shop';
  END IF;

  -- â”€â”€ Shop settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO shop_settings (shop_id, invoice_prefix, tax_enabled, tax_rate, currency_symbol)
    VALUES (v_shop_id, 'HCF', FALSE, 0.00, 'â‚¹')
    ON CONFLICT (shop_id) DO NOTHING;

  -- â”€â”€ Printer settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO printer_settings (shop_id, connection_type, paper_width, footer_lines)
    VALUES (v_shop_id, 'browser', 80, '["Thank you for visiting!", "Visit us again!"]')
    ON CONFLICT (shop_id) DO NOTHING;

  -- â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Hot Beverages', 1)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_hot
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Hot Beverages';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Savouries & Snacks', 2)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_savouries
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Savouries & Snacks';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Potato Fries', 3)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_fries
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Potato Fries';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Breads', 4)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_breads
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Breads';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Sandwich', 5)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_sandwich
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Sandwich';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Rolls', 6)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_rolls
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Rolls';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Chicken Corner', 7)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_chicken
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Chicken Corner';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Momos Corner', 8)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_momos
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Momos Corner';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Sea Foods', 9)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_seafood
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Sea Foods';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Maggie', 10)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_maggie
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Maggie';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Pasta', 11)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_pasta
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Pasta';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Burger', 12)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_burger
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Burger';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Mojito', 13)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_mojito
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Mojito';

  -- â”€â”€ Products: Hot Beverages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_hot, 'Tea', 15.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_hot, 'Coffee', 20.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_hot, 'Lemon Tea', 15.00, 3) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Savouries & Snacks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Veg Puffs', 15.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Egg Puffs', 20.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Chicken Puffs', 25.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Veg Samosa', 10.00, 4) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Chicken Samosa', 15.00, 5) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Potato Fries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_fries, 'French Fries Classic', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_fries, 'French Fries Peri-Peri', 45.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_fries, 'Potato Smilies', 50.00, 3) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Breads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Plain Bread Omelet', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Cheese Bread Omelet', 45.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Chicken Bread Omelet', 50.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Chicken Cheese Bread Omelet', 55.00, 4) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Sandwich â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Veg Sandwich', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Veg Cheese Sandwich', 50.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Paneer Sandwich', 60.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Chicken Cheese Sandwich', 70.00, 4) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Rolls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_rolls, 'Veg Roll', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_rolls, 'Chicken Roll', 50.00, 2) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Chicken Corner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Lollipop', 130.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Strips', 120.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Loaded Chicken Fries', 100.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Honey Garlic Chicken', 90.00, 4) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Nuggets', 60.00, 5) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Cutlet', 30.00, 6) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Momos Corner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_momos, 'Veg Fried Momos', 60.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_momos, 'Chicken Fried Momos', 80.00, 2) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Sea Foods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_seafood, 'Fish Finger', 90.00, 1) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Maggie â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Veg Maggie', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Egg Maggie', 45.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Chicken Maggie', 50.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Chicken Cheese Maggie', 60.00, 4) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Pasta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_pasta, 'Veg White Sauce Pasta', 80.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_pasta, 'Chicken White Sauce Pasta', 90.00, 2) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Burger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_burger, 'Veg Burger', 80.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_burger, 'Chicken Burger', 90.00, 2) ON CONFLICT DO NOTHING;

  -- â”€â”€ Products: Mojito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Blueberry Mint', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Strawberry Mint', 40.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Green Apple Mint', 40.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Orange Mint', 40.00, 4) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Mango Mint', 40.00, 5) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Heaven''s Cafe seed completed successfully. Shop ID: %', v_shop_id;
  RAISE NOTICE 'Total categories: 13, Total products: 43';

END $$;



