-- ============================================================
-- MIGRATION 011: Physical Stock Inward Verification, 
--               Raw Material Usage Analysis & Inventory Audit
-- ============================================================

-- ── 1. ENHANCE purchase_items FOR VERIFICATION ───────────────
ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS quantity_purchased NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS quantity_received NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS discrepancy_quantity NUMERIC(12,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discrepancy_reason TEXT;

-- Backfill existing rows
UPDATE purchase_items
SET quantity_purchased = COALESCE(quantity_purchased, quantity),
    quantity_received = COALESCE(quantity_received, quantity)
WHERE quantity_purchased IS NULL;

-- ── 2. ENHANCE purchase_orders FOR VERIFICATION ──────────────
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS has_discrepancy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discrepancy_summary TEXT;

-- ── 3. TABLE: raw_material_usage_logs ────────────────────────
CREATE TABLE IF NOT EXISTS raw_material_usage_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  manager_id        UUID NOT NULL REFERENCES auth.users(id),
  ingredient_id     UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  usage_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  reported_usage    NUMERIC(12,3) NOT NULL,
  expected_usage    NUMERIC(12,3) NOT NULL DEFAULT 0,
  variance          NUMERIC(12,3) NOT NULL DEFAULT 0,
  variance_percent  NUMERIC(8,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL CHECK (status IN ('normal', 'high_variance', 'low_variance')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_shop_date 
  ON raw_material_usage_logs(shop_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_ingredient 
  ON raw_material_usage_logs(ingredient_id);

-- ── 4. TABLE: inventory_audits ───────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_audits (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id               UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  audited_by            UUID NOT NULL REFERENCES auth.users(id),
  status                TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending_review', 'completed', 'reconciled')),
  total_items_audited   INTEGER NOT NULL DEFAULT 0,
  missing_items_count   INTEGER NOT NULL DEFAULT 0,
  surplus_items_count   INTEGER NOT NULL DEFAULT 0,
  total_loss_value      NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_audits_shop 
  ON inventory_audits(shop_id, created_at DESC);

-- ── 5. TABLE: inventory_audit_items ──────────────────────────
CREATE TABLE IF NOT EXISTS inventory_audit_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id        UUID NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  system_stock    NUMERIC(12,3) NOT NULL,
  physical_count  NUMERIC(12,3) NOT NULL,
  difference      NUMERIC(12,3) NOT NULL,
  unit_cost       NUMERIC(10,2) DEFAULT 0,
  loss_value      NUMERIC(10,2) DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('matched', 'missing', 'surplus')),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_items_audit 
  ON inventory_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_items_status 
  ON inventory_audit_items(status);

-- ── 6. RLS POLICIES ──────────────────────────────────────────
ALTER TABLE raw_material_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- raw_material_usage_logs
  DROP POLICY IF EXISTS "usage_logs_select" ON raw_material_usage_logs;
  CREATE POLICY "usage_logs_select" ON raw_material_usage_logs
    FOR SELECT USING (shop_id = current_user_shop_id());

  DROP POLICY IF EXISTS "usage_logs_insert" ON raw_material_usage_logs;
  CREATE POLICY "usage_logs_insert" ON raw_material_usage_logs
    FOR INSERT WITH CHECK (shop_id = current_user_shop_id());

  -- inventory_audits
  DROP POLICY IF EXISTS "audits_select" ON inventory_audits;
  CREATE POLICY "audits_select" ON inventory_audits
    FOR SELECT USING (shop_id = current_user_shop_id());

  DROP POLICY IF EXISTS "audits_insert" ON inventory_audits;
  CREATE POLICY "audits_insert" ON inventory_audits
    FOR INSERT WITH CHECK (shop_id = current_user_shop_id());

  DROP POLICY IF EXISTS "audits_update" ON inventory_audits;
  CREATE POLICY "audits_update" ON inventory_audits
    FOR UPDATE USING (shop_id = current_user_shop_id());

  -- inventory_audit_items
  DROP POLICY IF EXISTS "audit_items_select" ON inventory_audit_items;
  CREATE POLICY "audit_items_select" ON inventory_audit_items
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM inventory_audits a 
        WHERE a.id = audit_id AND a.shop_id = current_user_shop_id()
      )
    );

  DROP POLICY IF EXISTS "audit_items_insert" ON inventory_audit_items;
  CREATE POLICY "audit_items_insert" ON inventory_audit_items
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM inventory_audits a 
        WHERE a.id = audit_id AND a.shop_id = current_user_shop_id()
      )
    );
END $$;

-- ── 7. UPDATE receive_stock TO SUPPORT PHYSICAL VERIFICATION ──
CREATE OR REPLACE FUNCTION receive_stock(
  p_shop_id      UUID,
  p_manager_id   UUID,
  p_supplier_id  UUID,
  p_reference_no TEXT,
  p_notes        TEXT,
  p_items        JSONB  -- [{ingredient_id, quantity, quantity_purchased, quantity_received, unit_cost, discrepancy_reason}]
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_po_id           UUID;
  v_total_cost      NUMERIC := 0;
  v_item            JSONB;
  v_stock_before    NUMERIC;
  v_ingredient      RECORD;
  v_purchased_qty   NUMERIC;
  v_received_qty    NUMERIC;
  v_unit_cost       NUMERIC;
  v_disc_qty        NUMERIC;
  v_disc_reason     TEXT;
  v_has_disc        BOOLEAN := FALSE;
  v_disc_count      INTEGER := 0;
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

    v_stock_before  := v_ingredient.current_stock;
    v_unit_cost     := COALESCE((v_item->>'unit_cost')::NUMERIC, 0);
    
    -- Support both old & new payload formats
    v_received_qty  := COALESCE((v_item->>'quantity_received')::NUMERIC, (v_item->>'quantity')::NUMERIC, 0);
    v_purchased_qty := COALESCE((v_item->>'quantity_purchased')::NUMERIC, v_received_qty);
    v_disc_qty      := v_received_qty - v_purchased_qty;
    v_disc_reason   := v_item->>'discrepancy_reason';

    IF v_disc_qty != 0 THEN
      v_has_disc   := TRUE;
      v_disc_count := v_disc_count + 1;
    END IF;

    -- Insert purchase item with full discrepancy details
    INSERT INTO purchase_items (
      purchase_order_id, ingredient_id, quantity, 
      quantity_purchased, quantity_received, discrepancy_quantity, discrepancy_reason,
      unit_cost, total_cost
    ) VALUES (
      v_po_id,
      (v_item->>'ingredient_id')::UUID,
      v_received_qty, -- primary quantity reflects physical stock received
      v_purchased_qty,
      v_received_qty,
      v_disc_qty,
      v_disc_reason,
      v_unit_cost,
      v_received_qty * v_unit_cost
    );

    v_total_cost := v_total_cost + (v_received_qty * v_unit_cost);

    -- Update ingredient stock with PHYSICAL QUANTITY RECEIVED
    UPDATE ingredients
      SET current_stock = current_stock + v_received_qty,
          cost_per_unit = CASE WHEN v_unit_cost > 0 THEN v_unit_cost ELSE cost_per_unit END
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
      v_received_qty,
      v_unit_cost,
      v_po_id, 'purchase_order',
      CASE 
        WHEN v_disc_qty < 0 THEN 'Stock received physically (Shortfall of ' || ABS(v_disc_qty) || ' vs billed)'
        WHEN v_disc_qty > 0 THEN 'Stock received physically (Excess of ' || v_disc_qty || ' vs billed)'
        ELSE 'Stock received physically (Verified match)'
      END,
      v_stock_before,
      v_stock_before + v_received_qty,
      p_manager_id
    );
  END LOOP;

  -- Update purchase order with total cost & discrepancy flag
  UPDATE purchase_orders 
    SET total_cost = v_total_cost,
        has_discrepancy = v_has_disc,
        discrepancy_summary = CASE 
          WHEN v_has_disc THEN v_disc_count || ' item(s) had quantity discrepancy between bill and physical receipt'
          ELSE 'All items verified and matched'
        END
    WHERE id = v_po_id;

  -- Create notification if missing items / discrepancy found
  IF v_has_disc THEN
    INSERT INTO notifications (
      shop_id, type, title, message, related_id, related_type
    ) VALUES (
      p_shop_id,
      'stock_discrepancy',
      'Stock Inward Discrepancy Flagged',
      'Purchase order ' || COALESCE(p_reference_no, v_po_id::TEXT) || ' has ' || v_disc_count || ' item(s) with missing or mismatched physical stock.',
      v_po_id,
      'purchase_order'
    );
  END IF;

  -- Audit log
  INSERT INTO audit_logs (shop_id, user_id, action_type, table_name, record_id, new_value)
  VALUES (
    p_shop_id, p_manager_id, 'STOCK_RECEIVED_VERIFIED', 'purchase_orders', v_po_id,
    jsonb_build_object(
      'total_cost', v_total_cost,
      'has_discrepancy', v_has_disc,
      'discrepancy_count', v_disc_count
    )
  );

  RETURN jsonb_build_object(
    'purchase_order_id', v_po_id, 
    'total_cost', v_total_cost,
    'has_discrepancy', v_has_disc
  );
END;
$$;

-- ── 8. FUNCTION: record_raw_material_usage (with avg usage analysis) ──
CREATE OR REPLACE FUNCTION record_raw_material_usage(
  p_shop_id          UUID,
  p_manager_id       UUID,
  p_ingredient_id    UUID,
  p_reported_usage   NUMERIC,
  p_notes            TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_ing              RECORD;
  v_expected_usage   NUMERIC := 0;
  v_sales_usage      NUMERIC := 0;
  v_avg_daily_usage  NUMERIC := 0;
  v_variance         NUMERIC := 0;
  v_variance_pct     NUMERIC := 0;
  v_status           TEXT := 'normal';
  v_log_id           UUID;
  v_stock_before     NUMERIC;
BEGIN
  SELECT id, name, unit, current_stock INTO v_ing
    FROM ingredients
    WHERE id = p_ingredient_id AND shop_id = p_shop_id;

  IF v_ing.id IS NULL THEN
    RAISE EXCEPTION 'Ingredient not found';
  END IF;

  v_stock_before := v_ing.current_stock;

  -- 1. Calculate expected usage from today's completed sales
  SELECT COALESCE(SUM(si.quantity * COALESCE(ri.avg_usage_per_sale, ri.quantity, 1)), 0)
    INTO v_sales_usage
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    JOIN recipes r ON si.product_id = r.product_id
    JOIN recipe_items ri ON r.id = ri.recipe_id
    WHERE s.shop_id = p_shop_id
      AND DATE(s.created_at) = CURRENT_DATE
      AND s.status = 'completed'
      AND ri.ingredient_id = p_ingredient_id;

  -- 2. Check 30-day average daily usage if sales recipe not configured
  SELECT COALESCE(avg_daily_usage, 0) INTO v_avg_daily_usage
    FROM v_ingredient_avg_usage
    WHERE ingredient_id = p_ingredient_id;

  -- Use sales-based expected usage if available, else average daily usage
  IF v_sales_usage > 0 THEN
    v_expected_usage := ROUND(v_sales_usage, 3);
  ELSIF v_avg_daily_usage > 0 THEN
    v_expected_usage := ROUND(v_avg_daily_usage, 3);
  ELSE
    v_expected_usage := p_reported_usage; -- baseline when no history
  END IF;

  -- 3. Calculate Variance
  v_variance := p_reported_usage - v_expected_usage;
  IF v_expected_usage > 0 THEN
    v_variance_pct := ROUND(((v_variance / v_expected_usage) * 100), 2);
  ELSE
    v_variance_pct := 0;
  END IF;

  -- 4. Status determination (threshold: +20% is high variance, -25% is low variance)
  IF v_variance_pct > 20.00 THEN
    v_status := 'high_variance';
  ELSIF v_variance_pct < -25.00 THEN
    v_status := 'low_variance';
  ELSE
    v_status := 'normal';
  END IF;

  -- 5. Record log
  INSERT INTO raw_material_usage_logs (
    shop_id, manager_id, ingredient_id, usage_date,
    reported_usage, expected_usage, variance, variance_percent,
    status, notes
  ) VALUES (
    p_shop_id, p_manager_id, p_ingredient_id, CURRENT_DATE,
    p_reported_usage, v_expected_usage, v_variance, v_variance_pct,
    v_status, p_notes
  ) RETURNING id INTO v_log_id;

  -- 6. Trigger admin alert if high abnormal variance detected
  IF v_status = 'high_variance' THEN
    INSERT INTO notifications (
      shop_id, type, title, message, related_id, related_type
    ) VALUES (
      p_shop_id,
      'abnormal_usage',
      'Abnormal Raw Material Usage: ' || v_ing.name,
      'Manager reported ' || p_reported_usage || ' ' || v_ing.unit || ' used today, which is +' || v_variance_pct || '% above normal expected usage (' || v_expected_usage || ' ' || v_ing.unit || ').',
      v_log_id,
      'raw_material_usage'
    );
  END IF;

  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'reported_usage', p_reported_usage,
    'expected_usage', v_expected_usage,
    'variance', v_variance,
    'variance_percent', v_variance_pct,
    'status', v_status
  );
END;
$$;

-- ── 9. FUNCTION: submit_inventory_audit (Physical stock take & missing check) ──
CREATE OR REPLACE FUNCTION submit_inventory_audit(
  p_shop_id        UUID,
  p_manager_id     UUID,
  p_notes          TEXT,
  p_items          JSONB,   -- [{ingredient_id, physical_count, notes}]
  p_reconcile_stock BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_audit_id        UUID;
  v_item            JSONB;
  v_ing             RECORD;
  v_diff            NUMERIC;
  v_loss            NUMERIC;
  v_total_loss      NUMERIC := 0;
  v_missing_count   INTEGER := 0;
  v_surplus_count   INTEGER := 0;
  v_total_audited   INTEGER := 0;
  v_status          TEXT;
BEGIN
  -- Create audit header
  INSERT INTO inventory_audits (
    shop_id, audited_by, notes, status
  ) VALUES (
    p_shop_id, p_manager_id, p_notes, 
    CASE WHEN p_reconcile_stock THEN 'reconciled' ELSE 'completed' END
  ) RETURNING id INTO v_audit_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, unit, current_stock, cost_per_unit
      INTO v_ing
      FROM ingredients
      WHERE id = (v_item->>'ingredient_id')::UUID AND shop_id = p_shop_id;

    IF v_ing.id IS NOT NULL THEN
      v_total_audited := v_total_audited + 1;
      v_diff := (v_item->>'physical_count')::NUMERIC - v_ing.current_stock;
      
      IF v_diff < -0.001 THEN
        v_status := 'missing';
        v_missing_count := v_missing_count + 1;
        v_loss := ABS(v_diff) * COALESCE(v_ing.cost_per_unit, 0);
        v_total_loss := v_total_loss + v_loss;
      ELSIF v_diff > 0.001 THEN
        v_status := 'surplus';
        v_surplus_count := v_surplus_count + 1;
        v_loss := 0;
      ELSE
        v_status := 'matched';
        v_loss := 0;
      END IF;

      INSERT INTO inventory_audit_items (
        audit_id, ingredient_id, system_stock, physical_count,
        difference, unit_cost, loss_value, status, notes
      ) VALUES (
        v_audit_id,
        v_ing.id,
        v_ing.current_stock,
        (v_item->>'physical_count')::NUMERIC,
        v_diff,
        COALESCE(v_ing.cost_per_unit, 0),
        v_loss,
        v_status,
        v_item->>'notes'
      );

      -- If reconcile requested, update system stock to match physical reality
      IF p_reconcile_stock AND v_diff != 0 THEN
        UPDATE ingredients
          SET current_stock = (v_item->>'physical_count')::NUMERIC
          WHERE id = v_ing.id;

        INSERT INTO stock_movements (
          shop_id, ingredient_id, movement_type, quantity,
          reference_id, reference_type, reason,
          stock_before, stock_after, performed_by
        ) VALUES (
          p_shop_id, v_ing.id, 'adjustment', v_diff,
          v_audit_id, 'inventory_audit',
          'Physical stock audit reconciliation (' || v_status || ')',
          v_ing.current_stock, (v_item->>'physical_count')::NUMERIC,
          p_manager_id
        );
      END IF;
    END IF;
  END LOOP;

  -- Update audit totals
  UPDATE inventory_audits
    SET total_items_audited = v_total_audited,
        missing_items_count = v_missing_count,
        surplus_items_count = v_surplus_count,
        total_loss_value    = v_total_loss
    WHERE id = v_audit_id;

  -- If missing items found, notify Admin immediately
  IF v_missing_count > 0 THEN
    INSERT INTO notifications (
      shop_id, type, title, message, related_id, related_type
    ) VALUES (
      p_shop_id,
      'inventory_shrinkage',
      'Missing Items Flagged in Physical Stock Audit',
      v_missing_count || ' items missing from physical inventory with total estimated loss of ₹' || v_total_loss || '. Review audit details.',
      v_audit_id,
      'inventory_audit'
    );
  END IF;

  RETURN jsonb_build_object(
    'audit_id', v_audit_id,
    'total_audited', v_total_audited,
    'missing_count', v_missing_count,
    'surplus_count', v_surplus_count,
    'total_loss_value', v_total_loss
  );
END;
$$;
