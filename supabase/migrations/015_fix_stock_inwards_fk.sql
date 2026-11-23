-- ============================================================
-- MIGRATION 015: Stock Inwards Audit FK & RLS Fix
-- Links manager_id to profiles(id) so PostgREST resolves relationships
-- and ensures Admin and Manager both have full SELECT access
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_inwards_profiles'
  ) THEN
    ALTER TABLE stock_inwards
      ADD CONSTRAINT fk_stock_inwards_profiles
      FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policy so Admin and Manager can always select their shop inwards
DROP POLICY IF EXISTS "stock_inwards_select" ON stock_inwards;
CREATE POLICY "stock_inwards_select" ON stock_inwards
  FOR SELECT USING (shop_id = auth_shop_id() OR is_admin());
