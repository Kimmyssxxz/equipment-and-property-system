-- ==============================================================================
-- Migration: Add & Update All User Profile Columns in "users" Table in Supabase
-- ==============================================================================

-- 1. Ensure all user profile columns exist in Supabase "users" table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id" TEXT PRIMARY KEY DEFAULT ('usr_' || substr(md5(random()::text), 1, 12));
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "position" TEXT DEFAULT 'Supply Officer / Admin';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'Admin';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT DEFAULT 'NFSTISupply123';

-- 2. Ensure password column has a safe default value
ALTER TABLE "users" ALTER COLUMN "password" SET DEFAULT 'NFSTISupply123';

-- 3. Insert or update Admin accounts with all fields saved in Supabase
INSERT INTO "users" ("id", "username", "fullName", "email", "position", "role", "password")
VALUES 
  ('usr-admin-1', 'edolotallas', 'Elmer G. Dolotallas', 'supplyoffice1996@gmail.com', 'Supply Officer / Admin', 'Admin', 'NFSTISupply123'),
  ('usr-admin-queenie', 'queenie_ppsc', 'Queenie PPSC', 'queenie.ppsc@ppsc.gov.ph', 'Property & Supply Admin', 'Admin', 'NFSTISupply123')
ON CONFLICT ("username") DO UPDATE SET
  "fullName" = EXCLUDED."fullName",
  "email" = EXCLUDED."email",
  "position" = EXCLUDED."position",
  "role" = EXCLUDED."role",
  "password" = COALESCE("users"."password", EXCLUDED."password");

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
