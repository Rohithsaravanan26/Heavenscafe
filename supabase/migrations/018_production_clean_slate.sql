-- ============================================================
-- MIGRATION 018: PRODUCTION DEPLOYMENT CLEAN SLATE
-- Clears all testing and mock entries before going live in production.
--
-- PRESERVED ESSENTIAL ASSETS:
-- 1. All Menu Items, Prices (SP), Manufacturing Costs (CP), and Categories.
-- 2. Owner (ADMIN) and Manager (SHOP_MANAGER) login profiles.
-- 3. Shop information, Tax configurations, and 58mm/80mm Thermal Printer settings.
-- ============================================================

-- 1. CLEAR TRANSACTIONAL SALES & BILLING HISTORY
DELETE FROM sale_items;
DELETE FROM payments;
DELETE FROM sales;

-- 2. CLEAR CASH DRAWER CLOSINGS & RECONCILIATIONS
DELETE FROM daily_closings;

-- 3. CLEAR DAILY STORE EXPENSES & PRODUCT WASTAGE REPORTS
DELETE FROM expenses;
DELETE FROM product_wastages;

-- 4. CLEAR STOCK INWARDS & INVENTORY MOVEMENTS
DELETE FROM stock_inwards;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_movements') THEN
    DELETE FROM stock_movements;
  END IF;
END $$;

-- 5. CLEAR NOTIFICATIONS & AUDIT LOGS ACCUMULATED DURING TESTING
DELETE FROM notifications;
DELETE FROM audit_logs;

-- 6. RESET ALL PRODUCT INVENTORY COUNTS TO A CLEAN ZERO BASELINE
UPDATE products
SET current_stock = 0,
    updated_at = NOW();

-- 7. ENSURE ALL CATALOG PRODUCTS ARE ACTIVE & READY FOR LIVE COUNTER SALES
UPDATE products
SET is_active = TRUE,
    is_available = TRUE,
    track_stock = TRUE;
