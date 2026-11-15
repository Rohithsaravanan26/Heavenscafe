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
