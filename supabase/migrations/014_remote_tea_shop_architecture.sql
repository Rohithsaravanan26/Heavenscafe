-- ============================================================
-- MIGRATION 014: REMOTELY HANDLED TEA SHOP ARCHITECTURE
-- 1. Fix sales to profiles foreign key relationship for PostgREST
-- 2. Enhance expenses table with payment_source & manager RLS
-- 3. Create stock_inwards table and atomic record_stock_inward RPC
-- ============================================================

-- ── 1. FIX SALES TO PROFILES RELATIONSHIP ────────────────────
DO $$ BEGIN
  ALTER TABLE sales 
    DROP CONSTRAINT IF EXISTS fk_sales_manager_profiles;
  ALTER TABLE sales 
    ADD CONSTRAINT fk_sales_manager_profiles 
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_manager ON sales(manager_id);

-- ── 2. ENHANCE EXPENSES TABLE & RLS FOR MANAGER ──────────────
-- Add payment_source to track cash drawer petty cash vs owner direct transfers
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT 'cash_drawer' 
  CHECK (payment_source IN ('cash_drawer', 'online_upi', 'bank_transfer', 'owner_paid'));

-- Expand category check constraint to include tea shop specific raw materials
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check CHECK (
  category IN (
    'ingredients',          -- Tea powder, sugar, coffee, dry spices
    'produce_dairy',        -- Fresh milk, lemons, mint, ginger, ice blocks
    'packaging',            -- Disposable paper cups, tea parcel bags, tissue rolls
    'gas',                  -- Commercial cooking gas cylinder refills
    'electricity',          -- Shop power bill
    'water',                -- Drinking water 20L bubble cans
    'rent',                 -- Shop monthly rent
    'salary',               -- Staff salaries / daily worker wages
    'maintenance',          -- Stove repair, burner clean, blender service
    'other'                 -- Miscellaneous shop expenses
  )
);

-- RLS Helper
CREATE OR REPLACE FUNCTION auth_shop_id()
RETURNS UUID
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid() AND is_active = TRUE;
$$;

-- RLS: Allow SHOP_MANAGER to SELECT and INSERT expenses for their shop
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (shop_id = auth_shop_id());

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

DROP POLICY IF EXISTS "expenses_admin_manage" ON expenses;
CREATE POLICY "expenses_admin_manage" ON expenses
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── 3. CREATE stock_inwards TABLE & RPC FOR MANAGER ──────────
CREATE TABLE IF NOT EXISTS stock_inwards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  manager_id      UUID NOT NULL REFERENCES auth.users(id),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_cost      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  supplier_name   TEXT,
  invoice_ref     TEXT,
  notes           TEXT,
  inward_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_inwards_shop_date ON stock_inwards(shop_id, inward_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_inwards_product ON stock_inwards(product_id);

ALTER TABLE stock_inwards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_inwards_select" ON stock_inwards;
CREATE POLICY "stock_inwards_select" ON stock_inwards
  FOR SELECT USING (shop_id = auth_shop_id());

DROP POLICY IF EXISTS "stock_inwards_insert" ON stock_inwards;
CREATE POLICY "stock_inwards_insert" ON stock_inwards
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

-- Atomic Stock Inward RPC (<30ms)
CREATE OR REPLACE FUNCTION record_stock_inward(
  p_shop_id       UUID,
  p_manager_id    UUID,
  p_product_id    UUID,
  p_quantity      INTEGER,
  p_unit_cost     NUMERIC DEFAULT 0.00,
  p_supplier_name TEXT DEFAULT NULL,
  p_invoice_ref   TEXT DEFAULT NULL,
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_inward_id UUID;
  v_new_stock INTEGER;
  v_prod_name TEXT;
  v_cost      NUMERIC;
BEGIN
  SELECT name, cost_price INTO v_prod_name, v_cost
    FROM products WHERE id = p_product_id AND shop_id = p_shop_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF p_unit_cost > 0 THEN
    v_cost := p_unit_cost;
  END IF;

  -- 1. Insert inward log
  INSERT INTO stock_inwards (
    shop_id, manager_id, product_id, quantity, unit_cost, total_cost,
    supplier_name, invoice_ref, notes
  ) VALUES (
    p_shop_id, p_manager_id, p_product_id, p_quantity, v_cost, (p_quantity * v_cost),
    p_supplier_name, p_invoice_ref, p_notes
  ) RETURNING id INTO v_inward_id;

  -- 2. Increment product current stock
  UPDATE products
    SET current_stock = current_stock + p_quantity,
        cost_price = CASE WHEN p_unit_cost > 0 THEN p_unit_cost ELSE cost_price END
    WHERE id = p_product_id
    RETURNING current_stock INTO v_new_stock;

  RETURN jsonb_build_object(
    'inward_id', v_inward_id,
    'product_name', v_prod_name,
    'quantity_added', p_quantity,
    'new_stock', v_new_stock,
    'unit_cost', v_cost
  );
END;
$$;
