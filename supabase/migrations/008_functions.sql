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

-- ── Complete Sale (Atomic Transaction) ──────────────────────
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

-- ── Low Stock Alert Generator ────────────────────────────────
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

-- ── Dashboard KPIs ───────────────────────────────────────────
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

-- ── Receive Stock (atomic) ───────────────────────────────────
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

-- ── Record Wastage ───────────────────────────────────────────
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
