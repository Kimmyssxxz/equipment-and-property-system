-- =====================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES UPDATE
-- NFSTI Equipment & Property System
--
-- Instructions:
-- Copy and paste this complete SQL file into your Supabase SQL Editor and click RUN.
-- This grants access for the web app (anon & service_role keys) while security
-- and authentication are strictly enforced at the Next.js Middleware / API level.
-- =====================================================================

-- 1. employees
ALTER TABLE IF EXISTS "employees" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to employees" ON "employees";
DROP POLICY IF EXISTS "Allow public read access to employees" ON "employees";
DROP POLICY IF EXISTS "Allow service role write access to employees" ON "employees";
DROP POLICY IF EXISTS "Allow app access to employees" ON "employees";

CREATE POLICY "Allow app access to employees" 
  ON "employees" FOR ALL USING (true) WITH CHECK (true);

-- 2. inventory_sessions (Add inventoryPerson text column, Remove officeId & accountableOfficerId)
ALTER TABLE IF EXISTS "inventory_sessions" ADD COLUMN IF NOT EXISTS "inventoryPerson" TEXT;
ALTER TABLE IF EXISTS "inventory_sessions" DROP COLUMN IF EXISTS "accountableOfficerId";
ALTER TABLE IF EXISTS "inventory_sessions" DROP COLUMN IF EXISTS "inventoryPersonId";
ALTER TABLE IF EXISTS "inventory_sessions" DROP COLUMN IF EXISTS "officeId";
ALTER TABLE IF EXISTS "inventory_sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to inventory_sessions" ON "inventory_sessions";
DROP POLICY IF EXISTS "Allow public read access to inventory_sessions" ON "inventory_sessions";
DROP POLICY IF EXISTS "Allow service role write access to inventory_sessions" ON "inventory_sessions";
DROP POLICY IF EXISTS "Allow app access to inventory_sessions" ON "inventory_sessions";

CREATE POLICY "Allow app access to inventory_sessions" 
  ON "inventory_sessions" FOR ALL USING (true) WITH CHECK (true);

-- 3. offices
ALTER TABLE IF EXISTS "offices" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to offices" ON "offices";
DROP POLICY IF EXISTS "Allow public read access to offices" ON "offices";
DROP POLICY IF EXISTS "Allow service role write access to offices" ON "offices";
DROP POLICY IF EXISTS "Allow app access to offices" ON "offices";

CREATE POLICY "Allow app access to offices" 
  ON "offices" FOR ALL USING (true) WITH CHECK (true);

-- 4. organization_settings
ALTER TABLE IF EXISTS "organization_settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to organization_settings" ON "organization_settings";
DROP POLICY IF EXISTS "Allow public read access to organization_settings" ON "organization_settings";
DROP POLICY IF EXISTS "Allow service role write access to organization_settings" ON "organization_settings";
DROP POLICY IF EXISTS "Allow app access to organization_settings" ON "organization_settings";

CREATE POLICY "Allow app access to organization_settings" 
  ON "organization_settings" FOR ALL USING (true) WITH CHECK (true);

-- 5. physical_counts
ALTER TABLE IF EXISTS "physical_counts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to physical_counts" ON "physical_counts";
DROP POLICY IF EXISTS "Allow public read access to physical_counts" ON "physical_counts";
DROP POLICY IF EXISTS "Allow service role write access to physical_counts" ON "physical_counts";
DROP POLICY IF EXISTS "Allow app access to physical_counts" ON "physical_counts";

CREATE POLICY "Allow app access to physical_counts" 
  ON "physical_counts" FOR ALL USING (true) WITH CHECK (true);

-- 6. properties
ALTER TABLE IF EXISTS "properties" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to properties" ON "properties";
DROP POLICY IF EXISTS "Allow public read access to properties" ON "properties";
DROP POLICY IF EXISTS "Allow service role write access to properties" ON "properties";
DROP POLICY IF EXISTS "Allow app access to properties" ON "properties";

CREATE POLICY "Allow app access to properties" 
  ON "properties" FOR ALL USING (true) WITH CHECK (true);

-- 7. property_assignments
ALTER TABLE IF EXISTS "property_assignments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to property_assignments" ON "property_assignments";
DROP POLICY IF EXISTS "Allow public read access to property_assignments" ON "property_assignments";
DROP POLICY IF EXISTS "Allow service role write access to property_assignments" ON "property_assignments";
DROP POLICY IF EXISTS "Allow app access to property_assignments" ON "property_assignments";

CREATE POLICY "Allow app access to property_assignments" 
  ON "property_assignments" FOR ALL USING (true) WITH CHECK (true);

-- 8. property_categories
ALTER TABLE IF EXISTS "property_categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to property_categories" ON "property_categories";
DROP POLICY IF EXISTS "Allow public read access to property_categories" ON "property_categories";
DROP POLICY IF EXISTS "Allow service role write access to property_categories" ON "property_categories";
DROP POLICY IF EXISTS "Allow app access to property_categories" ON "property_categories";

CREATE POLICY "Allow app access to property_categories" 
  ON "property_categories" FOR ALL USING (true) WITH CHECK (true);

-- 9. report_signatories
ALTER TABLE IF EXISTS "report_signatories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to report_signatories" ON "report_signatories";
DROP POLICY IF EXISTS "Allow public read access to report_signatories" ON "report_signatories";
DROP POLICY IF EXISTS "Allow service role write access to report_signatories" ON "report_signatories";
DROP POLICY IF EXISTS "Allow app access to report_signatories" ON "report_signatories";

CREATE POLICY "Allow app access to report_signatories" 
  ON "report_signatories" FOR ALL USING (true) WITH CHECK (true);

-- 10. users
ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to users" ON "users";
DROP POLICY IF EXISTS "Allow service role full access to users" ON "users";
DROP POLICY IF EXISTS "Allow app access to users" ON "users";

CREATE POLICY "Allow app access to users" 
  ON "users" FOR ALL USING (true) WITH CHECK (true);

-- Additional optional tables (roles, reports, audit_logs, system_settings)
ALTER TABLE IF EXISTS "roles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to roles" ON "roles";
DROP POLICY IF EXISTS "Allow public read access to roles" ON "roles";
DROP POLICY IF EXISTS "Allow app access to roles" ON "roles";
CREATE POLICY "Allow app access to roles" ON "roles" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS "reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to reports" ON "reports";
DROP POLICY IF EXISTS "Allow public read access to reports" ON "reports";
DROP POLICY IF EXISTS "Allow app access to reports" ON "reports";
CREATE POLICY "Allow app access to reports" ON "reports" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS "audit_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to audit_logs" ON "audit_logs";
DROP POLICY IF EXISTS "Allow service role full access to audit_logs" ON "audit_logs";
DROP POLICY IF EXISTS "Allow app access to audit_logs" ON "audit_logs";
CREATE POLICY "Allow app access to audit_logs" ON "audit_logs" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS "system_settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to system_settings" ON "system_settings";
DROP POLICY IF EXISTS "Allow public read access to system_settings" ON "system_settings";
DROP POLICY IF EXISTS "Allow app access to system_settings" ON "system_settings";
CREATE POLICY "Allow app access to system_settings" ON "system_settings" FOR ALL USING (true) WITH CHECK (true);
