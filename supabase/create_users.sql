-- ============================================================
-- HEAVEN'S CAFE: CREATE ADMIN & MANAGER USERS
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pxadovlmslbszctwxdzl/sql
-- ============================================================

-- Ensure pgcrypto extension is active for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_shop_id       UUID;
  v_admin_id      UUID;
  v_manager_id    UUID;
  
  -- ── CONFIGURATION (Change passwords if desired) ─────────
  v_admin_email   TEXT := 'admin@heavenscafe.com';
  v_admin_pass    TEXT := 'Admin@123456';
  v_admin_name    TEXT := 'Cafe Owner (Admin)';
  v_admin_phone   TEXT := '9876543210';

  v_manager_email TEXT := 'manager@heavenscafe.com';
  v_manager_pass  TEXT := 'Manager@123456';
  v_manager_name  TEXT := 'Shop Manager';
  v_manager_phone TEXT := '9876543211';
BEGIN

  -- 1. Get or create Heaven's Cafe shop
  SELECT id INTO v_shop_id FROM public.shops WHERE name = 'Heaven''s Cafe' LIMIT 1;
  IF v_shop_id IS NULL THEN
    INSERT INTO public.shops (name) VALUES ('Heaven''s Cafe') RETURNING id INTO v_shop_id;
  END IF;

  -- 2. CREATE ADMIN USER IN auth.users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt(v_admin_pass, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_admin_name),
      NOW(),
      NOW(),
      '',
      ''
    );
  ELSE
    -- If user already exists, update password
    UPDATE auth.users 
    SET encrypted_password = crypt(v_admin_pass, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- 3. LINK ADMIN PROFILE (role = 'ADMIN')
  INSERT INTO public.profiles (id, shop_id, full_name, phone, role, is_active)
  VALUES (v_admin_id, v_shop_id, v_admin_name, v_admin_phone, 'ADMIN', TRUE)
  ON CONFLICT (id) DO UPDATE 
    SET shop_id = v_shop_id,
        role = 'ADMIN',
        full_name = v_admin_name,
        phone = v_admin_phone,
        is_active = TRUE;


  -- 4. CREATE MANAGER USER IN auth.users
  SELECT id INTO v_manager_id FROM auth.users WHERE email = v_manager_email LIMIT 1;
  
  IF v_manager_id IS NULL THEN
    v_manager_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_manager_id,
      'authenticated',
      'authenticated',
      v_manager_email,
      crypt(v_manager_pass, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_manager_name),
      NOW(),
      NOW(),
      '',
      ''
    );
  ELSE
    -- If user already exists, update password
    UPDATE auth.users 
    SET encrypted_password = crypt(v_manager_pass, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_manager_id;
  END IF;

  -- 5. LINK MANAGER PROFILE (role = 'SHOP_MANAGER')
  INSERT INTO public.profiles (id, shop_id, full_name, phone, role, is_active)
  VALUES (v_manager_id, v_shop_id, v_manager_name, v_manager_phone, 'SHOP_MANAGER', TRUE)
  ON CONFLICT (id) DO UPDATE 
    SET shop_id = v_shop_id,
        role = 'SHOP_MANAGER',
        full_name = v_manager_name,
        phone = v_manager_phone,
        is_active = TRUE;

  RAISE NOTICE 'Admin user created: %', v_admin_email;
  RAISE NOTICE 'Manager user created: %', v_manager_email;

END $$;
