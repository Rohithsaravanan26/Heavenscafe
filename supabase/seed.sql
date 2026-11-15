-- ============================================================
-- HEAVEN'S CAFE MENU SEED
-- Imports all 43 products across 13 categories
-- IDEMPOTENT: safe to run multiple times (ON CONFLICT DO NOTHING)
-- ============================================================

DO $$
DECLARE
  v_shop_id       UUID;
  v_cat_hot       UUID;
  v_cat_savouries UUID;
  v_cat_fries     UUID;
  v_cat_breads    UUID;
  v_cat_sandwich  UUID;
  v_cat_rolls     UUID;
  v_cat_chicken   UUID;
  v_cat_momos     UUID;
  v_cat_seafood   UUID;
  v_cat_maggie    UUID;
  v_cat_pasta     UUID;
  v_cat_burger    UUID;
  v_cat_mojito    UUID;
BEGIN

  -- ── Create or find the shop ─────────────────────────────
  INSERT INTO shops (name)
    VALUES ('Heaven''s Cafe')
    ON CONFLICT DO NOTHING;

  SELECT id INTO v_shop_id FROM shops WHERE name = 'Heaven''s Cafe' LIMIT 1;

  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'Could not create shop';
  END IF;

  -- ── Shop settings ───────────────────────────────────────
  INSERT INTO shop_settings (shop_id, invoice_prefix, tax_enabled, tax_rate, currency_symbol)
    VALUES (v_shop_id, 'HCF', FALSE, 0.00, '₹')
    ON CONFLICT (shop_id) DO NOTHING;

  -- ── Printer settings ────────────────────────────────────
  INSERT INTO printer_settings (shop_id, connection_type, paper_width, footer_lines)
    VALUES (v_shop_id, 'browser', 80, '["Thank you for visiting!", "Visit us again!"]')
    ON CONFLICT (shop_id) DO NOTHING;

  -- ── Categories ──────────────────────────────────────────
  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Hot Beverages', 1)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_hot
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Hot Beverages';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Savouries & Snacks', 2)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_savouries
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Savouries & Snacks';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Potato Fries', 3)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_fries
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Potato Fries';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Breads', 4)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_breads
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Breads';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Sandwich', 5)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_sandwich
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Sandwich';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Rolls', 6)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_rolls
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Rolls';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Chicken Corner', 7)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_chicken
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Chicken Corner';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Momos Corner', 8)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_momos
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Momos Corner';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Sea Foods', 9)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_seafood
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Sea Foods';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Maggie', 10)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_maggie
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Maggie';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Pasta', 11)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_pasta
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Pasta';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Burger', 12)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_burger
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Burger';

  INSERT INTO menu_categories (shop_id, name, display_order)
    VALUES (v_shop_id, 'Mojito', 13)
    ON CONFLICT (shop_id, name) DO NOTHING;
  SELECT id INTO v_cat_mojito
    FROM menu_categories WHERE shop_id = v_shop_id AND name = 'Mojito';

  -- ── Products: Hot Beverages ─────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_hot, 'Tea', 15.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_hot, 'Coffee', 20.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_hot, 'Lemon Tea', 15.00, 3) ON CONFLICT DO NOTHING;

  -- ── Products: Savouries & Snacks ───────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Veg Puffs', 15.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Egg Puffs', 20.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Chicken Puffs', 25.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Veg Samosa', 10.00, 4) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_savouries, 'Chicken Samosa', 15.00, 5) ON CONFLICT DO NOTHING;

  -- ── Products: Potato Fries ──────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_fries, 'French Fries Classic', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_fries, 'French Fries Peri-Peri', 45.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_fries, 'Potato Smilies', 50.00, 3) ON CONFLICT DO NOTHING;

  -- ── Products: Breads ────────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Plain Bread Omelet', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Cheese Bread Omelet', 45.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Chicken Bread Omelet', 50.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_breads, 'Chicken Cheese Bread Omelet', 55.00, 4) ON CONFLICT DO NOTHING;

  -- ── Products: Sandwich ──────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Veg Sandwich', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Veg Cheese Sandwich', 50.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Paneer Sandwich', 60.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_sandwich, 'Chicken Cheese Sandwich', 70.00, 4) ON CONFLICT DO NOTHING;

  -- ── Products: Rolls ─────────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_rolls, 'Veg Roll', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_rolls, 'Chicken Roll', 50.00, 2) ON CONFLICT DO NOTHING;

  -- ── Products: Chicken Corner ────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Lollipop', 130.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Strips', 120.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Loaded Chicken Fries', 100.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Honey Garlic Chicken', 90.00, 4) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Nuggets', 60.00, 5) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_chicken, 'Chicken Cutlet', 30.00, 6) ON CONFLICT DO NOTHING;

  -- ── Products: Momos Corner ──────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_momos, 'Veg Fried Momos', 60.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_momos, 'Chicken Fried Momos', 80.00, 2) ON CONFLICT DO NOTHING;

  -- ── Products: Sea Foods ─────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_seafood, 'Fish Finger', 90.00, 1) ON CONFLICT DO NOTHING;

  -- ── Products: Maggie ────────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Veg Maggie', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Egg Maggie', 45.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Chicken Maggie', 50.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_maggie, 'Chicken Cheese Maggie', 60.00, 4) ON CONFLICT DO NOTHING;

  -- ── Products: Pasta ─────────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_pasta, 'Veg White Sauce Pasta', 80.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_pasta, 'Chicken White Sauce Pasta', 90.00, 2) ON CONFLICT DO NOTHING;

  -- ── Products: Burger ────────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_burger, 'Veg Burger', 80.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_burger, 'Chicken Burger', 90.00, 2) ON CONFLICT DO NOTHING;

  -- ── Products: Mojito ────────────────────────────────────
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Blueberry Mint', 40.00, 1) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Strawberry Mint', 40.00, 2) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Green Apple Mint', 40.00, 3) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Orange Mint', 40.00, 4) ON CONFLICT DO NOTHING;
  INSERT INTO products (shop_id, category_id, name, base_price, display_order)
    VALUES (v_shop_id, v_cat_mojito, 'Mango Mint', 40.00, 5) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Heaven''s Cafe seed completed successfully. Shop ID: %', v_shop_id;
  RAISE NOTICE 'Total categories: 13, Total products: 43';

END $$;
