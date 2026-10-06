-- Migration to add user-scoping columns to tables
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "createdBy" TEXT DEFAULT 'edolotallas';
UPDATE "properties" SET "createdBy" = 'edolotallas' WHERE "createdBy" IS NULL;

ALTER TABLE "physical_counts" ADD COLUMN IF NOT EXISTS "createdBy" TEXT DEFAULT 'edolotallas';
UPDATE "physical_counts" SET "createdBy" = 'edolotallas' WHERE "createdBy" IS NULL;

ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "createdBy" TEXT DEFAULT 'edolotallas';
UPDATE "reports" SET "createdBy" = 'edolotallas' WHERE "createdBy" IS NULL;

ALTER TABLE "property_assignments" ADD COLUMN IF NOT EXISTS "createdBy" TEXT DEFAULT 'edolotallas';
UPDATE "property_assignments" SET "createdBy" = 'edolotallas' WHERE "createdBy" IS NULL;

ALTER TABLE "inventory_sessions" ADD COLUMN IF NOT EXISTS "createdBy" TEXT DEFAULT 'edolotallas';
UPDATE "inventory_sessions" SET "createdBy" = 'edolotallas' WHERE "createdBy" IS NULL;

-- Also add createdBy to employees and offices (optional scoping)
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "createdBy" TEXT DEFAULT 'edolotallas';
UPDATE "employees" SET "createdBy" = 'edolotallas' WHERE "createdBy" IS NULL;

ALTER TABLE "offices" ADD COLUMN IF NOT EXISTS "createdBy" TEXT DEFAULT 'edolotallas';
UPDATE "offices" SET "createdBy" = 'edolotallas' WHERE "createdBy" IS NULL;

