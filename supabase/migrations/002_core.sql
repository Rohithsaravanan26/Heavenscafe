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
  currency_symbol TEXT NOT NULL DEFAULT '₹',
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
