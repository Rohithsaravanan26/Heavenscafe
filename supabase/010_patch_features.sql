-- ============================================================
-- PATCH 010: Feature updates – deduplication, avg_usage,
--            v_low_stock_alerts, card_last4, complete_sale fix
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pxadovlmslbszctwxdzl/sql
-- ============================================================

-- ── 1. DEDUPLICATE PRODUCTS & REASSIGN FOREIGN KEYS ──────────
-- First, reassign any references from duplicate products to the original (oldest) product
WITH ranked_products AS (
  SELECT id,
         shop_id,
         name,
         FIRST_VALUE(id) OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS keep_id,
         ROW_NUMBER() OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS rn
  FROM products
),
dup_products AS (
  SELECT id AS dup_id, keep_id
  FROM ranked_products
  WHERE rn > 1
)
UPDATE sale_items si
SET product_id = dp.keep_id
FROM dup_products dp
WHERE si.product_id = dp.dup_id;

-- Reassign recipes if any point to duplicates
WITH ranked_products AS (
  SELECT id,
         shop_id,
         name,
         FIRST_VALUE(id) OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS keep_id,
         ROW_NUMBER() OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS rn
  FROM products
),
dup_products AS (
  SELECT id AS dup_id, keep_id
  FROM ranked_products
  WHERE rn > 1
)
DELETE FROM recipes
WHERE product_id IN (SELECT dup_id FROM dup_products);

-- Delete duplicate products
WITH ranked_products AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS rn
  FROM products
)
DELETE FROM products
WHERE id IN (
  SELECT id FROM ranked_products WHERE rn > 1
);

-- Ensure products cannot be duplicated in the future
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_products_shop_name'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT uq_products_shop_name UNIQUE (shop_id, name);
  END IF;
END $$;

-- ── 2. DEDUPLICATE MENU CATEGORIES ───────────────────────────
-- Reassign any products referencing duplicate categories
WITH ranked_categories AS (
  SELECT id,
         shop_id,
         name,
         FIRST_VALUE(id) OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS keep_id,
         ROW_NUMBER() OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS rn
  FROM menu_categories
),
dup_cats AS (
  SELECT id AS dup_id, keep_id
  FROM ranked_categories
  WHERE rn > 1
)
UPDATE products p
SET category_id = dc.keep_id
FROM dup_cats dc
WHERE p.category_id = dc.dup_id;

-- Delete duplicate categories
WITH ranked_categories AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY shop_id, name
           ORDER BY created_at ASC
         ) AS rn
  FROM menu_categories
)
DELETE FROM menu_categories
WHERE id IN (
  SELECT id FROM ranked_categories WHERE rn > 1
);

-- ── 3. ADD avg_usage_per_sale TO recipe_items ─────────────────
ALTER TABLE recipe_items
  ADD COLUMN IF NOT EXISTS avg_usage_per_sale NUMERIC DEFAULT NULL;

-- ── 4. ADD card_last4 TO payments ────────────────────────────
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS card_last4 TEXT DEFAULT NULL;

-- ── 5. VIEW: v_low_stock_alerts ──────────────────────────────
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT
  i.id              AS ingredient_id,
  i.shop_id,
  i.name,
  i.unit,
  i.current_stock,
  i.min_stock,
  GREATEST(0, i.min_stock - i.current_stock) AS shortfall,
  CASE
    WHEN i.current_stock <= 0                    THEN 'out_of_stock'
    WHEN i.current_stock <= i.min_stock * 0.5    THEN 'critical'
    ELSE                                              'low'
  END AS alert_level,
  sup.name  AS supplier_name,
  sup.phone AS supplier_phone
FROM ingredients i
LEFT JOIN suppliers sup ON i.preferred_supplier_id = sup.id
WHERE i.is_active = TRUE
  AND i.current_stock <= i.min_stock;

-- ── 6. VIEW: v_ingredient_avg_usage (last 30 days) ───────────
CREATE OR REPLACE VIEW v_ingredient_avg_usage AS
SELECT
  ingredient_id,
  AVG(ABS(quantity)) AS avg_daily_usage,
  SUM(ABS(quantity)) AS total_30d_usage,
  COUNT(*)           AS movement_count
FROM stock_movements
WHERE movement_type = 'sale_deduction'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY ingredient_id;

-- ── 7. UPDATE complete_sale TO USE avg_usage_per_sale ────────
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
  v_deduct_qty   NUMERIC;
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

  v_invoice_no := generate_invoice_no(p_shop_id);

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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
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

    IF v_product.track_inventory THEN
      SELECT * INTO v_recipe
        FROM recipes
        WHERE product_id = v_product.id AND is_active = TRUE;

      IF v_recipe.id IS NOT NULL THEN
        FOR v_ri IN
          SELECT ri.ingredient_id,
                 -- Use avg_usage_per_sale if calibrated, else recipe quantity
                 COALESCE(ri.avg_usage_per_sale, ri.quantity) AS usage_qty,
                 i.current_stock
            FROM recipe_items ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.recipe_id = v_recipe.id
        LOOP
          v_stock_before := v_ri.current_stock;
          v_deduct_qty   := v_ri.usage_qty * (v_item->>'quantity')::INTEGER;

          UPDATE ingredients
            SET current_stock = current_stock - v_deduct_qty
            WHERE id = v_ri.ingredient_id;

          INSERT INTO stock_movements (
            shop_id, ingredient_id, movement_type, quantity,
            reference_id, reference_type, reason,
            stock_before, stock_after, performed_by
          ) VALUES (
            p_shop_id, v_ri.ingredient_id, 'sale_deduction',
            -v_deduct_qty,
            v_sale_id, 'sale',
            'Auto-deducted by sale ' || v_invoice_no,
            v_stock_before,
            v_stock_before - v_deduct_qty,
            p_manager_id
          );
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO payments (
    sale_id, method, amount,
    amount_tendered, change_amount, reference
  ) VALUES (
    v_sale_id, p_payment_method, p_payment_amount,
    p_amount_tendered, p_change_amount, p_payment_ref
  );

  PERFORM check_low_stock_alerts(p_shop_id);

  INSERT INTO audit_logs (
    shop_id, user_id, action_type, table_name, record_id, new_value
  ) VALUES (
    p_shop_id, p_manager_id, 'SALE_COMPLETED', 'sales', v_sale_id,
    jsonb_build_object(
      'invoice_no',     v_invoice_no,
      'total_amount',   p_total_amount,
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

-- ── Confirmation ─────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE 'Patch 010 applied:';
  RAISE NOTICE '  Duplicate categories removed';
  RAISE NOTICE '  Duplicate products removed';
  RAISE NOTICE '  avg_usage_per_sale column added to recipe_items';
  RAISE NOTICE '  card_last4 column added to payments';
  RAISE NOTICE '  v_low_stock_alerts view created';
  RAISE NOTICE '  v_ingredient_avg_usage view created';
  RAISE NOTICE '  complete_sale function updated with avg_usage support';
END $$;
