-- ============================================================
-- PATCH 011: FIX COMMERCIAL SUMMARY REVENUE DOUBLING JOIN BUG
-- ============================================================
-- Fixes the cartesian product bug where sales joined with sale_items
-- multiplied SUM(s.total_amount) by the number of line items on each bill.

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
  -- 1. Sales totals (strictly from sales table, NO joins that duplicate rows)
  SELECT
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO
    v_gross_sales, v_total_bills
  FROM sales
  WHERE shop_id = p_shop_id
    AND status = 'completed'
    AND DATE(created_at) >= p_start_date
    AND DATE(created_at) <= p_end_date;

  -- 2. Manufacturing cost & profit (from sale_items joined to completed sales)
  SELECT
    COALESCE(SUM(si.cost_price * si.quantity), 0),
    COALESCE(SUM(si.profit), 0)
  INTO
    v_total_cogs, v_gross_profit
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE s.shop_id = p_shop_id
    AND s.status = 'completed'
    AND DATE(s.created_at) >= p_start_date
    AND DATE(s.created_at) <= p_end_date;

  -- If profit was not stored or is 0, gross profit = gross_sales - cogs
  IF v_gross_profit = 0 AND v_gross_sales > 0 AND v_total_cogs > 0 THEN
    v_gross_profit := v_gross_sales - v_total_cogs;
  END IF;

  -- 3. Wastage loss
  SELECT
    COALESCE(SUM(total_loss), 0),
    COALESCE(SUM(quantity), 0)
  INTO
    v_wastage_loss, v_wastage_items
  FROM product_wastages
  WHERE shop_id = p_shop_id
    AND wastage_date >= p_start_date
    AND wastage_date <= p_end_date;

  -- 4. Store expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expenses
  FROM expenses
  WHERE shop_id = p_shop_id
    AND expense_date >= p_start_date
    AND expense_date <= p_end_date;

  -- 5. Net Profit = Gross Profit - Wastage Loss - Expenses
  v_net_profit := v_gross_profit - v_wastage_loss - v_expenses;

  -- 6. Average Bill
  IF v_total_bills > 0 THEN
    v_avg_bill := ROUND(v_gross_sales / v_total_bills, 2);
  END IF;

  -- 7. Low stock count
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
