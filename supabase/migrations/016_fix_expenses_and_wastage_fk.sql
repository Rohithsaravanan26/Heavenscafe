-- ============================================================
-- MIGRATION 016: Expenses & Wastage FK and RLS Alignment
-- Links recorded_by and manager_id to profiles(id)
-- Ensures Admin and Manager have complete visibility into their shop's records
-- ============================================================

DO $$
BEGIN
  -- 1. Expenses FK to profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_profiles'
  ) THEN
    ALTER TABLE expenses
      ADD CONSTRAINT fk_expenses_profiles
      FOREIGN KEY (recorded_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- 2. Product Wastages FK to profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_wastages_profiles'
  ) THEN
    ALTER TABLE product_wastages
      ADD CONSTRAINT fk_product_wastages_profiles
      FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Relax and secure RLS policies for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_read" ON expenses;
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (shop_id = auth_shop_id() OR is_admin());

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (shop_id = auth_shop_id() OR is_admin());

-- 4. Relax and secure RLS policies for product_wastages
ALTER TABLE product_wastages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_wastages_select" ON product_wastages;
CREATE POLICY "product_wastages_select" ON product_wastages
  FOR SELECT USING (shop_id = auth_shop_id() OR is_admin());

DROP POLICY IF EXISTS "product_wastages_insert" ON product_wastages;
CREATE POLICY "product_wastages_insert" ON product_wastages
  FOR INSERT WITH CHECK (shop_id = auth_shop_id() OR is_admin());
