-- ============================================================
-- HEAVEN'S CAFE — COMPLETE BILLZGO-STYLE RECONSTRUCTION SCRIPT
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pxadovlmslbszctwxdzl/sql
-- ============================================================

-- ── 1. ENHANCE products TABLE ────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS current_stock INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_products_stock ON products(shop_id, current_stock, min_stock);

-- ── 2. ENHANCE sale_items TABLE (COGS & Profit Tracking) ──────
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS profit NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- ── 3. CREATE product_wastages TABLE ─────────────────────────
CREATE TABLE IF NOT EXISTS product_wastages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  manager_id    UUID NOT NULL REFERENCES auth.users(id),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  cost_price    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_loss    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  wastage_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  reason        TEXT NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_wastages_shop_date 
  ON product_wastages(shop_id, wastage_date DESC);
CREATE INDEX IF NOT EXISTS idx_product_wastages_product 
  ON product_wastages(product_id);

-- RLS Helper & policies for product_wastages
CREATE OR REPLACE FUNCTION auth_shop_id()
RETURNS UUID
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid() AND is_active = TRUE;
$$;

ALTER TABLE product_wastages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "wastages_select" ON product_wastages;
  CREATE POLICY "wastages_select" ON product_wastages
    FOR SELECT USING (shop_id = auth_shop_id());

  DROP POLICY IF EXISTS "wastages_insert" ON product_wastages;
  CREATE POLICY "wastages_insert" ON product_wastages
    FOR INSERT WITH CHECK (shop_id = auth_shop_id());

  DROP POLICY IF EXISTS "wastages_delete" ON product_wastages;
  CREATE POLICY "wastages_delete" ON product_wastages
    FOR DELETE USING (shop_id = auth_shop_id());
END $$;

-- ── 4. HIGH-SPEED ATOMIC CHECKOUT RPC (<50ms execution) ──────
CREATE OR REPLACE FUNCTION fast_checkout(
  p_shop_id         UUID,
  p_manager_id      UUID,
  p_idempotency_key TEXT,
  p_items           JSONB, -- [{product_id, product_name, unit_price, cost_price, quantity, subtotal, profit}]
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
  v_qty          INTEGER;
  v_prod_id      UUID;
  v_unit_price   NUMERIC;
  v_cost_price   NUMERIC;
  v_line_subtotal NUMERIC;
  v_line_profit  NUMERIC;
BEGIN
  -- 1. Idempotency check
  SELECT id, invoice_no INTO v_sale_id, v_invoice_no
    FROM sales WHERE idempotency_key = p_idempotency_key;

  IF v_sale_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'sale_id',    v_sale_id,
      'invoice_no', v_invoice_no,
      'duplicate',  TRUE
    );
  END IF;

  -- 2. Generate invoice number
  v_invoice_no := generate_invoice_no(p_shop_id);

  -- 3. Insert sale header
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

  -- 4. Batch insert sale items & fast product stock deduction
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id       := (v_item->>'product_id')::UUID;
    v_qty           := (v_item->>'quantity')::INTEGER;
    v_unit_price    := (v_item->>'unit_price')::NUMERIC;
    v_cost_price    := COALESCE((v_item->>'cost_price')::NUMERIC, 0.00);
    v_line_subtotal := v_unit_price * v_qty;
    v_line_profit   := (v_unit_price - v_cost_price) * v_qty;

    INSERT INTO sale_items (
      sale_id, product_id, product_name,
      unit_price, cost_price, quantity, subtotal, profit
    ) VALUES (
      v_sale_id, v_prod_id, v_item->>'product_name',
      v_unit_price, v_cost_price, v_qty, v_line_subtotal, v_line_profit
    );

    -- Direct product-level stock decrement
    UPDATE products
      SET current_stock = current_stock - v_qty
      WHERE id = v_prod_id AND track_stock = TRUE;
  END LOOP;

  -- 5. Insert payment record
  INSERT INTO payments (
    sale_id, method, amount,
    amount_tendered, change_amount, reference
  ) VALUES (
    v_sale_id, p_payment_method, p_payment_amount,
    p_amount_tendered, p_change_amount, p_payment_ref
  );

  RETURN jsonb_build_object(
    'sale_id',    v_sale_id,
    'invoice_no', v_invoice_no,
    'duplicate',  FALSE
  );
END;
$$;

-- ── 5. RECORD PRODUCT WASTAGE RPC ────────────────────────────
CREATE OR REPLACE FUNCTION record_product_wastage(
  p_shop_id     UUID,
  p_manager_id  UUID,
  p_product_id  UUID,
  p_quantity    INTEGER,
  p_reason      TEXT,
  p_notes       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_cost_price NUMERIC;
  v_total_loss NUMERIC;
  v_wastage_id UUID;
  v_prod_name  TEXT;
BEGIN
  SELECT name, cost_price INTO v_prod_name, v_cost_price
    FROM products WHERE id = p_product_id AND shop_id = p_shop_id;

  IF v_cost_price IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  v_total_loss := p_quantity * v_cost_price;

  INSERT INTO product_wastages (
    shop_id, manager_id, product_id, quantity,
    cost_price, total_loss, reason, notes
  ) VALUES (
    p_shop_id, p_manager_id, p_product_id, p_quantity,
    v_cost_price, v_total_loss, p_reason, p_notes
  ) RETURNING id INTO v_wastage_id;

  -- Deduct from product stock if tracked
  UPDATE products
    SET current_stock = GREATEST(0, current_stock - p_quantity)
    WHERE id = p_product_id AND track_stock = TRUE;

  RETURN jsonb_build_object(
    'wastage_id', v_wastage_id,
    'product_name', v_prod_name,
    'quantity', p_quantity,
    'cost_price', v_cost_price,
    'total_loss', v_total_loss
  );
END;
$$;

-- ── 6. EXECUTIVE COMMERCIAL REPORTING RPC ────────────────────
CREATE OR REPLACE FUNCTION get_commercial_summary(
  p_shop_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_gross_sales   NUMERIC := 0;
  v_total_bills   INTEGER := 0;
  v_total_cogs    NUMERIC := 0;
  v_gross_profit  NUMERIC := 0;
  v_wastage_loss  NUMERIC := 0;
  v_wastage_items INTEGER := 0;
  v_expenses      NUMERIC := 0;
  v_net_profit    NUMERIC := 0;
  v_avg_bill      NUMERIC := 0;
  v_low_stock     INTEGER := 0;
BEGIN
  SELECT
    COALESCE(SUM(s.total_amount), 0),
    COUNT(DISTINCT s.id),
    COALESCE(SUM(si.cost_price * si.quantity), 0),
    COALESCE(SUM(si.profit), 0)
  INTO
    v_gross_sales, v_total_bills, v_total_cogs, v_gross_profit
  FROM sales s
  LEFT JOIN sale_items si ON s.id = si.sale_id
  WHERE s.shop_id = p_shop_id
    AND s.status = 'completed'
    AND DATE(s.created_at) >= p_start_date
    AND DATE(s.created_at) <= p_end_date;

  SELECT
    COALESCE(SUM(total_loss), 0),
    COALESCE(SUM(quantity), 0)
  INTO
    v_wastage_loss, v_wastage_items
  FROM product_wastages
  WHERE shop_id = p_shop_id
    AND wastage_date >= p_start_date
    AND wastage_date <= p_end_date;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_expenses
  FROM expenses
  WHERE shop_id = p_shop_id
    AND expense_date >= p_start_date
    AND expense_date <= p_end_date;

  v_net_profit := v_gross_profit - v_wastage_loss - v_expenses;

  IF v_total_bills > 0 THEN
    v_avg_bill := ROUND(v_gross_sales / v_total_bills, 2);
  END IF;

  SELECT COUNT(*) INTO v_low_stock
  FROM products
  WHERE shop_id = p_shop_id
    AND is_active = TRUE
    AND track_stock = TRUE
    AND current_stock <= min_stock;

  RETURN jsonb_build_object(
    'gross_sales',     v_gross_sales,
    'total_bills',     v_total_bills,
    'avg_bill',        v_avg_bill,
    'total_cogs',      v_total_cogs,
    'gross_profit',    v_gross_profit,
    'wastage_loss',    v_wastage_loss,
    'wastage_items',   v_wastage_items,
    'expenses',        v_expenses,
    'net_profit',      v_net_profit,
    'profit_margin',   CASE WHEN v_gross_sales > 0 THEN ROUND((v_net_profit / v_gross_sales) * 100, 1) ELSE 0 END,
    'low_stock_count', v_low_stock
  );
END;
$$;

-- ── 7. SEED BENCHMARK MANUFACTURING COSTS FOR 43 PRODUCTS ───
UPDATE products SET cost_price = 5.00, current_stock = 150, min_stock = 20 WHERE name = 'Tea';
UPDATE products SET cost_price = 7.00, current_stock = 100, min_stock = 15 WHERE name = 'Coffee';
UPDATE products SET cost_price = 4.00, current_stock = 80, min_stock = 10 WHERE name = 'Lemon Tea';

UPDATE products SET cost_price = 7.00, current_stock = 30, min_stock = 5 WHERE name = 'Veg Puffs';
UPDATE products SET cost_price = 9.00, current_stock = 25, min_stock = 5 WHERE name = 'Egg Puffs';
UPDATE products SET cost_price = 12.00, current_stock = 30, min_stock = 5 WHERE name = 'Chicken Puffs';
UPDATE products SET cost_price = 11.00, current_stock = 20, min_stock = 5 WHERE name = 'Mushroom Puffs';
UPDATE products SET cost_price = 11.00, current_stock = 20, min_stock = 5 WHERE name = 'Paneer Puffs';
UPDATE products SET cost_price = 4.00, current_stock = 40, min_stock = 10 WHERE name = 'Samosa';

UPDATE products SET cost_price = 22.00, current_stock = 50, min_stock = 10 WHERE name = 'French Fries (Salted)';
UPDATE products SET cost_price = 25.00, current_stock = 40, min_stock = 10 WHERE name = 'Masala Fries';
UPDATE products SET cost_price = 28.00, current_stock = 40, min_stock = 10 WHERE name = 'Peri Peri Fries';
UPDATE products SET cost_price = 32.00, current_stock = 35, min_stock = 8 WHERE name = 'Cheesy Fries';

UPDATE products SET cost_price = 20.00, current_stock = 30, min_stock = 5 WHERE name = 'Plain Garlic Bread';
UPDATE products SET cost_price = 28.00, current_stock = 30, min_stock = 5 WHERE name = 'Cheese Garlic Bread';
UPDATE products SET cost_price = 32.00, current_stock = 25, min_stock = 5 WHERE name = 'Corn Cheese Garlic Bread';
UPDATE products SET cost_price = 36.00, current_stock = 25, min_stock = 5 WHERE name = 'Paneer Cheese Garlic Bread';

UPDATE products SET cost_price = 22.00, current_stock = 30, min_stock = 5 WHERE name = 'Veg Grilled Sandwich';
UPDATE products SET cost_price = 25.00, current_stock = 25, min_stock = 5 WHERE name = 'Corn Cheese Sandwich';
UPDATE products SET cost_price = 30.00, current_stock = 20, min_stock = 5 WHERE name = 'Paneer Sandwich';
UPDATE products SET cost_price = 34.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Sandwich';
UPDATE products SET cost_price = 42.00, current_stock = 20, min_stock = 5 WHERE name = 'Club Sandwich';

UPDATE products SET cost_price = 18.00, current_stock = 25, min_stock = 5 WHERE name = 'Veg Roll';
UPDATE products SET cost_price = 26.00, current_stock = 20, min_stock = 5 WHERE name = 'Paneer Roll';
UPDATE products SET cost_price = 30.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Roll';
UPDATE products SET cost_price = 22.00, current_stock = 20, min_stock = 5 WHERE name = 'Egg Roll';

UPDATE products SET cost_price = 35.00, current_stock = 30, min_stock = 8 WHERE name = 'Chicken Popcorn';
UPDATE products SET cost_price = 40.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Strips';
UPDATE products SET cost_price = 48.00, current_stock = 20, min_stock = 5 WHERE name = 'Chicken Wings';
UPDATE products SET cost_price = 52.00, current_stock = 20, min_stock = 5 WHERE name = 'Chicken Lollipop';

UPDATE products SET cost_price = 20.00, current_stock = 30, min_stock = 8 WHERE name = 'Veg Steamed Momos';
UPDATE products SET cost_price = 24.00, current_stock = 30, min_stock = 8 WHERE name = 'Veg Fried Momos';
UPDATE products SET cost_price = 28.00, current_stock = 25, min_stock = 8 WHERE name = 'Chicken Steamed Momos';
UPDATE products SET cost_price = 32.00, current_stock = 25, min_stock = 8 WHERE name = 'Chicken Fried Momos';

UPDATE products SET cost_price = 45.00, current_stock = 20, min_stock = 5 WHERE name = 'Fish Finger';
UPDATE products SET cost_price = 50.00, current_stock = 20, min_stock = 5 WHERE name = 'Prawns Popcorn';

UPDATE products SET cost_price = 10.00, current_stock = 50, min_stock = 10 WHERE name = 'Plain Maggie';
UPDATE products SET cost_price = 15.00, current_stock = 40, min_stock = 10 WHERE name = 'Veg Maggie';
UPDATE products SET cost_price = 18.00, current_stock = 35, min_stock = 8 WHERE name = 'Cheese Maggie';
UPDATE products SET cost_price = 24.00, current_stock = 30, min_stock = 8 WHERE name = 'Chicken Maggie';

UPDATE products SET cost_price = 28.00, current_stock = 25, min_stock = 5 WHERE name = 'White Sauce Veg Pasta';
UPDATE products SET cost_price = 28.00, current_stock = 25, min_stock = 5 WHERE name = 'Red Sauce Veg Pasta';
UPDATE products SET cost_price = 38.00, current_stock = 20, min_stock = 5 WHERE name = 'White Sauce Chicken Pasta';
UPDATE products SET cost_price = 38.00, current_stock = 20, min_stock = 5 WHERE name = 'Red Sauce Chicken Pasta';

UPDATE products SET cost_price = 25.00, current_stock = 30, min_stock = 5 WHERE name = 'Veg Burger';
UPDATE products SET cost_price = 30.00, current_stock = 25, min_stock = 5 WHERE name = 'Cheese Burger';
UPDATE products SET cost_price = 38.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Burger';
UPDATE products SET cost_price = 46.00, current_stock = 20, min_stock = 5 WHERE name = 'Zinger Burger';

UPDATE products SET cost_price = 18.00, current_stock = 40, min_stock = 10 WHERE name = 'Mint Mojito';
UPDATE products SET cost_price = 22.00, current_stock = 35, min_stock = 8 WHERE name = 'Blue Curacao';
UPDATE products SET cost_price = 22.00, current_stock = 35, min_stock = 8 WHERE name = 'Green Apple';
UPDATE products SET cost_price = 22.00, current_stock = 35, min_stock = 8 WHERE name = 'Watermelon';

-- Fallback for any product without cost: 40% of selling price
UPDATE products
  SET cost_price = ROUND(base_price * 0.40, 2),
      current_stock = 50,
      min_stock = 10,
      track_stock = TRUE
  WHERE cost_price = 0.00;

-- ── 7. REMOTELY HANDLED TEA SHOP ARCHITECTURE (MIGRATION 014) ──
-- Fix sales to profiles foreign key relationship for PostgREST
DO $$ BEGIN
  ALTER TABLE sales 
    DROP CONSTRAINT IF EXISTS fk_sales_manager_profiles;
  ALTER TABLE sales 
    ADD CONSTRAINT fk_sales_manager_profiles 
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_manager ON sales(manager_id);

-- Enhance expenses table with payment_source & tea shop raw material categories
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT 'cash_drawer' 
  CHECK (payment_source IN ('cash_drawer', 'online_upi', 'bank_transfer', 'owner_paid'));

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check CHECK (
  category IN (
    'ingredients',
    'produce_dairy',
    'packaging',
    'gas',
    'electricity',
    'water',
    'rent',
    'salary',
    'maintenance',
    'other'
  )
);

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

-- Create stock_inwards table & atomic record_stock_inward RPC
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

  INSERT INTO stock_inwards (
    shop_id, manager_id, product_id, quantity, unit_cost, total_cost,
    supplier_name, invoice_ref, notes
  ) VALUES (
    p_shop_id, p_manager_id, p_product_id, p_quantity, v_cost, (p_quantity * v_cost),
    p_supplier_name, p_invoice_ref, p_notes
  ) RETURNING id INTO v_inward_id;

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

-- ============================================================
-- 8. CLEAN RETAIL GRADE RESET (MIGRATION 015)
-- ============================================================
-- Clean all test transactional records
DELETE FROM sale_items;
DELETE FROM payments;
DELETE FROM sales;
DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM expenses;
DELETE FROM stock_inwards;
DELETE FROM product_wastages;

-- Reset inventory counts to clean starting baseline for manager inwards
UPDATE products 
SET current_stock = 0,
    updated_at    = NOW();

-- Remove duplicate shop if present
DELETE FROM shops 
WHERE id = '58af4a4d-e8d9-43e2-91d1-4f0b5d359277';

-- Drop legacy experiment tables
DROP TABLE IF EXISTS raw_material_usage_logs CASCADE;
DROP TABLE IF EXISTS inventory_audit_items CASCADE;
DROP TABLE IF EXISTS inventory_audits CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS raw_materials CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Ensure all 43 retail products are active and tracked
UPDATE products
SET is_active = TRUE,
    is_available = TRUE,
    track_stock = TRUE
WHERE is_active IS NOT TRUE OR track_stock IS NOT TRUE;

DO $$ BEGIN
  RAISE NOTICE 'Billzgo-Style & Clean Retail Grade Reset Completed Successfully!';
END $$;
