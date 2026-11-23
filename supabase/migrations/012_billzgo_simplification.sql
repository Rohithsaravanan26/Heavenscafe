-- ============================================================
-- MIGRATION 012: Billzgo-Style Simplification
-- 1. Product-level manufacturing costs & stock tracking
-- 2. Streamlined Product Wastage table
-- 3. High-speed atomic fast_checkout RPC (<50ms)
-- 4. Fast Daily / Weekly / Monthly P&L reporting functions
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

-- RLS for product_wastages
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
  -- 1. Idempotency check (prevents double billing if cashier taps twice)
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
    v_prod_id      := (v_item->>'product_id')::UUID;
    v_qty          := (v_item->>'quantity')::INTEGER;
    v_unit_price   := (v_item->>'unit_price')::NUMERIC;
    v_cost_price   := COALESCE((v_item->>'cost_price')::NUMERIC, 0.00);
    v_line_subtotal := v_unit_price * v_qty;
    v_line_profit  := (v_unit_price - v_cost_price) * v_qty;

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
  -- Sales & Profit from completed bills
  SELECT
    COALESCE(SUM(s.total_amount), 0),
    COUNT(s.id),
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

  -- Wastage Loss
  SELECT
    COALESCE(SUM(total_loss), 0),
    COALESCE(SUM(quantity), 0)
  INTO
    v_wastage_loss, v_wastage_items
  FROM product_wastages
  WHERE shop_id = p_shop_id
    AND wastage_date >= p_start_date
    AND wastage_date <= p_end_date;

  -- Operating expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expenses
  FROM expenses
  WHERE shop_id = p_shop_id
    AND expense_date >= p_start_date
    AND expense_date <= p_end_date;

  -- Net Profit = Gross Profit - Wastage Loss - Expenses
  v_net_profit := v_gross_profit - v_wastage_loss - v_expenses;

  IF v_total_bills > 0 THEN
    v_avg_bill := ROUND(v_gross_sales / v_total_bills, 2);
  END IF;

  -- Low stock items count
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
