
-- =====================================================================
-- EQUIPMENT AND PROPERTY INVENTORY MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- Copy and paste this complete SQL file into Supabase SQL Editor and click RUN.
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT PRIMARY KEY DEFAULT ('role_' || substr(md5(random()::text), 1, 12)),
  "name" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Offices Table
CREATE TABLE IF NOT EXISTS "offices" (
  "id" TEXT PRIMARY KEY DEFAULT ('off_' || substr(md5(random()::text), 1, 12)),
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "head" TEXT DEFAULT '',
  "email" TEXT,
  "phone" TEXT,
  "floor" TEXT,
  "notes" TEXT,
  "status" TEXT DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Employees Table
CREATE TABLE IF NOT EXISTS "employees" (
  "id" TEXT PRIMARY KEY DEFAULT ('emp_' || substr(md5(random()::text), 1, 12)),
  "employeeId" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "officeId" TEXT NOT NULL REFERENCES "offices"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "email" TEXT,
  "phone" TEXT,
  "status" TEXT DEFAULT 'ACTIVE' NOT NULL,
  "assumedDate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Users Table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT ('usr_' || substr(md5(random()::text), 1, 12)),
  "username" TEXT UNIQUE NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "fullName" TEXT NOT NULL,
  "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "employeeId" TEXT UNIQUE REFERENCES "employees"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Property Categories Table
CREATE TABLE IF NOT EXISTS "property_categories" (
  "id" TEXT PRIMARY KEY DEFAULT ('cat_' || substr(md5(random()::text), 1, 12)),
  "name" TEXT UNIQUE NOT NULL,
  "code" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Properties Table
CREATE TABLE IF NOT EXISTS "properties" (
  "id" TEXT PRIMARY KEY DEFAULT ('prop_' || substr(md5(random()::text), 1, 12)),
  "propertyNumber" TEXT UNIQUE NOT NULL,
  "article" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "property_categories"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "unit" TEXT DEFAULT 'unit' NOT NULL,
  "unitValue" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  "quantityPerCard" INTEGER DEFAULT 1 NOT NULL,
  "acquisitionDate" TIMESTAMP WITH TIME ZONE,
  "poNumber" TEXT,
  "poDate" TIMESTAMP WITH TIME ZONE,
  "serialNumber" TEXT,
  "remarks" TEXT,
  "status" TEXT DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Idempotent column addition for existing databases
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;


-- 7. Property Assignments Table
CREATE TABLE IF NOT EXISTS "property_assignments" (
  "id" TEXT PRIMARY KEY DEFAULT ('asgn_' || substr(md5(random()::text), 1, 12)),
  "propertyId" TEXT NOT NULL REFERENCES "properties"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "employeeId" TEXT NOT NULL REFERENCES "employees"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "officeId" TEXT NOT NULL REFERENCES "offices"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "previousEmployeeId" TEXT,
  "previousOfficeId" TEXT,
  "assignmentDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "remarks" TEXT,
  "transferredBy" TEXT DEFAULT 'System Admin',
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Inventory Sessions Table
CREATE TABLE IF NOT EXISTS "inventory_sessions" (
  "id" TEXT PRIMARY KEY DEFAULT ('inv_' || substr(md5(random()::text), 1, 12)),
  "sessionCode" TEXT UNIQUE NOT NULL,
  "title" TEXT NOT NULL,
  "countingDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "asOfDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "status" TEXT DEFAULT 'IN_PROGRESS' NOT NULL,
  "inventoryPerson" TEXT,
  "categoryFilter" TEXT,
  "remarks" TEXT,
  "finalizedAt" TIMESTAMP WITH TIME ZONE,
  "finalizedBy" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "inventory_sessions" ADD COLUMN IF NOT EXISTS "inventoryPerson" TEXT;

-- 9. Physical Counts Table
CREATE TABLE IF NOT EXISTS "physical_counts" (
  "id" TEXT PRIMARY KEY DEFAULT ('cnt_' || substr(md5(random()::text), 1, 12)),
  "sessionId" TEXT NOT NULL REFERENCES "inventory_sessions"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "propertyId" TEXT NOT NULL REFERENCES "properties"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "quantityPerCard" INTEGER DEFAULT 1 NOT NULL,
  "physicalCount" INTEGER,
  "difference" INTEGER,
  "status" TEXT DEFAULT 'PENDING' NOT NULL,
  "remarks" TEXT,
  "countedAt" TIMESTAMP WITH TIME ZONE,
  "countedBy" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "physical_counts_sessionId_propertyId_key" UNIQUE ("sessionId", "propertyId")
);

-- 10. Reports Table
CREATE TABLE IF NOT EXISTS "reports" (
  "id" TEXT PRIMARY KEY DEFAULT ('rep_' || substr(md5(random()::text), 1, 12)),
  "reportNumber" TEXT UNIQUE NOT NULL,
  "reportType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "asOfDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "accountablePersonId" TEXT NOT NULL REFERENCES "employees"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "officeId" TEXT NOT NULL REFERENCES "offices"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "inventorySessionId" TEXT REFERENCES "inventory_sessions"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "generatedBy" TEXT DEFAULT 'Admin' NOT NULL,
  "status" TEXT DEFAULT 'FINALIZED' NOT NULL,
  "signatories" JSONB,
  "snapshotData" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 11. Report Signatories Table
CREATE TABLE IF NOT EXISTS "report_signatories" (
  "id" TEXT PRIMARY KEY DEFAULT ('sig_' || substr(md5(random()::text), 1, 12)),
  "roleKey" TEXT UNIQUE NOT NULL,
  "label" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "isDefault" BOOLEAN DEFAULT true NOT NULL,
  "order" INTEGER DEFAULT 1 NOT NULL
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY DEFAULT ('log_' || substr(md5(random()::text), 1, 12)),
  "userId" TEXT REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "userName" TEXT DEFAULT 'Admin' NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. System Settings Table (Dynamic Key-Value Store)
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" TEXT PRIMARY KEY DEFAULT ('set_' || substr(md5(random()::text), 1, 12)),
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "category" TEXT DEFAULT 'GENERAL' NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 14. Organization Settings Table (Structured Columns matching Form Fields)
CREATE TABLE IF NOT EXISTS "organization_settings" (
  "id" TEXT PRIMARY KEY DEFAULT 'default_org_settings',
  "orgName" TEXT NOT NULL DEFAULT 'National Forensic Science Training Institute',
  "orgCode" TEXT DEFAULT 'NFSTI',
  "officeAddress" TEXT DEFAULT 'Camp Vicente Lim, Mayapa Calamba City Laguna',
  "contactEmail" TEXT DEFAULT 'supplyoffice1996@gmail.com',
  "contactPhone" TEXT DEFAULT '(02) 8372-5000',
  "defaultCurrency" TEXT DEFAULT 'PHP',
  "currencySymbol" TEXT DEFAULT '₱',
  "reportHeaderTitle" TEXT DEFAULT 'REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT',
  "defaultUnit" TEXT DEFAULT 'unit',
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Full access allowed for application requests; security is enforced at Next.js Middleware/API layer
-- =====================================================================

ALTER TABLE "property_categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to property_categories" ON "property_categories";
DROP POLICY IF EXISTS "Allow app access to property_categories" ON "property_categories";
CREATE POLICY "Allow app access to property_categories" ON "property_categories" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to properties" ON "properties";
DROP POLICY IF EXISTS "Allow app access to properties" ON "properties";
CREATE POLICY "Allow app access to properties" ON "properties" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "offices" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to offices" ON "offices";
DROP POLICY IF EXISTS "Allow app access to offices" ON "offices";
CREATE POLICY "Allow app access to offices" ON "offices" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to employees" ON "employees";
DROP POLICY IF EXISTS "Allow app access to employees" ON "employees";
CREATE POLICY "Allow app access to employees" ON "employees" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to roles" ON "roles";
DROP POLICY IF EXISTS "Allow app access to roles" ON "roles";
CREATE POLICY "Allow app access to roles" ON "roles" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to users" ON "users";
DROP POLICY IF EXISTS "Allow app access to users" ON "users";
CREATE POLICY "Allow app access to users" ON "users" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "property_assignments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to property_assignments" ON "property_assignments";
DROP POLICY IF EXISTS "Allow app access to property_assignments" ON "property_assignments";
CREATE POLICY "Allow app access to property_assignments" ON "property_assignments" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "inventory_sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to inventory_sessions" ON "inventory_sessions";
DROP POLICY IF EXISTS "Allow app access to inventory_sessions" ON "inventory_sessions";
CREATE POLICY "Allow app access to inventory_sessions" ON "inventory_sessions" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "physical_counts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to physical_counts" ON "physical_counts";
DROP POLICY IF EXISTS "Allow app access to physical_counts" ON "physical_counts";
CREATE POLICY "Allow app access to physical_counts" ON "physical_counts" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to reports" ON "reports";
DROP POLICY IF EXISTS "Allow app access to reports" ON "reports";
CREATE POLICY "Allow app access to reports" ON "reports" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "report_signatories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to report_signatories" ON "report_signatories";
DROP POLICY IF EXISTS "Allow app access to report_signatories" ON "report_signatories";
CREATE POLICY "Allow app access to report_signatories" ON "report_signatories" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to audit_logs" ON "audit_logs";
DROP POLICY IF EXISTS "Allow app access to audit_logs" ON "audit_logs";
CREATE POLICY "Allow app access to audit_logs" ON "audit_logs" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to system_settings" ON "system_settings";
DROP POLICY IF EXISTS "Allow app access to system_settings" ON "system_settings";
CREATE POLICY "Allow app access to system_settings" ON "system_settings" FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- ESSENTIAL SYSTEM ROLES (Required for system permission matrix)
-- =====================================================================
INSERT INTO "roles" ("id", "name", "description") VALUES
  ('role-1', 'ADMIN', 'Full system administrative access, configuration, and data overrides'),
  ('role-2', 'INVENTORY_OFFICER', 'Manages physical counting, barcode tagging, and reconciliations'),
  ('role-3', 'ACCOUNTABLE_OFFICER', 'End-user custodian of assigned equipment & properties'),
  ('role-4', 'VIEWER', 'Read-only access to property inventory lists and generated reports')
ON CONFLICT ("name") DO NOTHING;
