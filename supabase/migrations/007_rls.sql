-- ============================================================
-- MIGRATION 007: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_print_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- ── Helper Functions ────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_shop_id()
RETURNS UUID
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid() AND is_active = TRUE
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = TRUE
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT auth_role() = 'ADMIN'
$$;

-- ── SHOPS ───────────────────────────────────────────────────
CREATE POLICY "shops_read" ON shops
  FOR SELECT USING (id = auth_shop_id());

CREATE POLICY "shops_admin_write" ON shops
  FOR ALL USING (id = auth_shop_id() AND is_admin());

-- ── PROFILES ────────────────────────────────────────────────
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR (shop_id = auth_shop_id() AND is_admin())
  );

CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── SHOP SETTINGS ───────────────────────────────────────────
CREATE POLICY "shop_settings_read" ON shop_settings
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "shop_settings_admin_write" ON shop_settings
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── PRINTER SETTINGS ────────────────────────────────────────
CREATE POLICY "printer_settings_all" ON printer_settings
  FOR ALL USING (shop_id = auth_shop_id());

-- ── MENU CATEGORIES ─────────────────────────────────────────
CREATE POLICY "menu_categories_read" ON menu_categories
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "menu_categories_admin_write" ON menu_categories
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── PRODUCTS ────────────────────────────────────────────────
CREATE POLICY "products_read" ON products
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── PRODUCT PRICE HISTORY ───────────────────────────────────
CREATE POLICY "price_history_read" ON product_price_history
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "price_history_admin_insert" ON product_price_history
  FOR INSERT WITH CHECK (is_admin());

-- ── PRODUCT VARIANTS ────────────────────────────────────────
CREATE POLICY "product_variants_read" ON product_variants
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "product_variants_admin_write" ON product_variants
  FOR ALL USING (is_admin());

-- ── PRODUCT ADDONS ──────────────────────────────────────────
CREATE POLICY "product_addons_read" ON product_addons
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "product_addons_admin_write" ON product_addons
  FOR ALL USING (is_admin());

-- ── PRODUCT IMAGES ──────────────────────────────────────────
CREATE POLICY "product_images_read" ON product_images
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "product_images_admin_write" ON product_images
  FOR ALL USING (is_admin());

-- ── SUPPLIERS ───────────────────────────────────────────────
CREATE POLICY "suppliers_read" ON suppliers
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "suppliers_admin_write" ON suppliers
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── INGREDIENTS ─────────────────────────────────────────────
CREATE POLICY "ingredients_read" ON ingredients
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "ingredients_admin_write" ON ingredients
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── RECIPES ─────────────────────────────────────────────────
CREATE POLICY "recipes_read" ON recipes
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "recipes_admin_write" ON recipes
  FOR ALL USING (is_admin());

CREATE POLICY "recipe_items_read" ON recipe_items
  FOR SELECT USING (
    recipe_id IN (
      SELECT r.id FROM recipes r
      JOIN products p ON r.product_id = p.id
      WHERE p.shop_id = auth_shop_id()
    )
  );

CREATE POLICY "recipe_items_admin_write" ON recipe_items
  FOR ALL USING (is_admin());

-- ── PURCHASE ORDERS ─────────────────────────────────────────
CREATE POLICY "purchase_orders_read" ON purchase_orders
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "purchase_orders_insert" ON purchase_orders
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

CREATE POLICY "purchase_orders_admin_update" ON purchase_orders
  FOR UPDATE USING (shop_id = auth_shop_id() AND is_admin());

CREATE POLICY "purchase_items_read" ON purchase_items
  FOR SELECT USING (
    purchase_order_id IN (SELECT id FROM purchase_orders WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "purchase_items_insert" ON purchase_items
  FOR INSERT WITH CHECK (
    purchase_order_id IN (SELECT id FROM purchase_orders WHERE shop_id = auth_shop_id())
  );

-- ── STOCK MOVEMENTS ─────────────────────────────────────────
CREATE POLICY "stock_movements_read" ON stock_movements
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "stock_movements_insert" ON stock_movements
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

-- ── SALES ───────────────────────────────────────────────────
CREATE POLICY "sales_read" ON sales
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

CREATE POLICY "sales_admin_update" ON sales
  FOR UPDATE USING (shop_id = auth_shop_id() AND is_admin());

-- ── SALE ITEMS ──────────────────────────────────────────────
CREATE POLICY "sale_items_read" ON sale_items
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "sale_items_insert" ON sale_items
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

-- ── PAYMENTS ────────────────────────────────────────────────
CREATE POLICY "payments_read" ON payments
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

-- ── REFUNDS ─────────────────────────────────────────────────
CREATE POLICY "refunds_read" ON refunds
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "refunds_admin_write" ON refunds
  FOR ALL USING (is_admin());

CREATE POLICY "refund_items_read" ON refund_items
  FOR SELECT USING (
    refund_id IN (
      SELECT r.id FROM refunds r
      JOIN sales s ON r.sale_id = s.id
      WHERE s.shop_id = auth_shop_id()
    )
  );

-- ── PRINT LOGS ──────────────────────────────────────────────
CREATE POLICY "print_logs_read" ON receipt_print_logs
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

CREATE POLICY "print_logs_insert" ON receipt_print_logs
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE shop_id = auth_shop_id())
  );

-- ── EXPENSES ────────────────────────────────────────────────
CREATE POLICY "expenses_admin" ON expenses
  FOR ALL USING (shop_id = auth_shop_id() AND is_admin());

-- ── DAILY CLOSINGS ──────────────────────────────────────────
CREATE POLICY "closings_read" ON daily_closings
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "closings_insert" ON daily_closings
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

CREATE POLICY "closings_admin_update" ON daily_closings
  FOR UPDATE USING (shop_id = auth_shop_id() AND is_admin());

-- ── NOTIFICATIONS ───────────────────────────────────────────
CREATE POLICY "notifications_read" ON notifications
  FOR SELECT USING (shop_id = auth_shop_id());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (shop_id = auth_shop_id());

CREATE POLICY "notifications_admin_insert" ON notifications
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

-- ── AUDIT LOGS ──────────────────────────────────────────────
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT USING (shop_id = auth_shop_id() AND is_admin());

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (shop_id = auth_shop_id());

-- ── ROLE PERMISSIONS ────────────────────────────────────────
CREATE POLICY "role_permissions_read" ON role_permissions
  FOR SELECT USING (TRUE);

CREATE POLICY "role_permissions_admin_write" ON role_permissions
  FOR ALL USING (is_admin());
