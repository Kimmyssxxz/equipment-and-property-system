-- ==============================================================================
-- Migration: Add Profile Fields to "users" Table in Supabase
-- Run this script in the Supabase SQL Editor to ensure all user profile fields 
-- (position, role, password, fullName, email) are stored directly in Supabase.
-- ==============================================================================

-- 1. Add missing profile columns to "users" table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "position" TEXT DEFAULT 'Supply Officer / Admin';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'Admin';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- 2. Insert or update Admin accounts directly in Supabase
INSERT INTO "users" ("id", "username", "fullName", "email", "position", "role")
VALUES 
  ('usr-admin-1', 'edolotallas', 'Elmer G. Dolotallas', 'supplyoffice1996@gmail.com', 'Supply Officer / Admin', 'Admin'),
  ('usr-admin-queenie', 'queenie_ppsc', 'Queenie PPSC', 'queenie.ppsc@ppsc.gov.ph', 'Property & Supply Admin', 'Admin')
ON CONFLICT ("username") DO UPDATE SET
  "fullName" = EXCLUDED."fullName",
  "email" = EXCLUDED."email",
  "position" = EXCLUDED."position",
  "role" = EXCLUDED."role";

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
