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
