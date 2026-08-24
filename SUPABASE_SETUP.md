# Supabase Database Integration Guide

This guide walks you through connecting your **Equipment and Property Inventory Management System** to a **Supabase PostgreSQL Database**.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **"New Project"**.
3. Choose an **Organization**, enter a **Project Name** (e.g., `equipment-and-property-system`), set a strong **Database Password** (save this password!), and select the region closest to you.
4. Wait ~1-2 minutes for Supabase to provision your PostgreSQL database.

---

## 2. Get Your Supabase API Keys & Connection Strings

### A. API Keys (For Supabase JavaScript Client)
In your Supabase Dashboard:
1. Go to **Project Settings (Gear Icon) → API**.
2. Copy the following:
   - **Project URL** (e.g. `https://xyzprojectid.supabase.co`)
   - **anon public** key (`eyJhbGci...`)
   - **service_role secret** key (`eyJhbGci...`)

### B. Database URLs (For Prisma ORM & Direct SQL)
In your Supabase Dashboard:
1. Go to **Project Settings → Database**.
2. Under **Connection string**:
   - Select **URI** tab.
   - Choose **Transaction** (Port 6543) or **Session** pooler for `DATABASE_URL`.
   - Choose **Direct Connection** (Port 5432) for `DIRECT_URL`.
   - Remember to replace `[YOUR-PASSWORD]` with the database password you created in step 1.

---

## 3. Configure Your `.env.local` File

Open or create [`.env.local`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/.env.local) in your project root and paste your credentials:

```env
# Supabase REST / Auth API Client Keys
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Supabase PostgreSQL Database Connections (Prisma ORM)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

---

## 4. Run the SQL Migration (1-Click in Supabase SQL Editor)

We've prepared the full PostgreSQL schema and seed data in [`prisma/supabase_schema.sql`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/prisma/supabase_schema.sql).

### Option A: Using Supabase Dashboard (Fastest)
1. Open your Supabase Dashboard and go to **SQL Editor** (`/dashboard/project/_/sql`).
2. Click **"New query"**.
3. Copy the contents of [`prisma/supabase_schema.sql`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/prisma/supabase_schema.sql) (or click **"Copy SQL Schema"** inside the app at **Settings → Supabase & Database**).
4. Paste it into the editor and click **RUN**.
5. All 13 tables, foreign keys, indexes, and initial equipment records will be created in seconds!

### Option B: Using Prisma CLI
Alternatively, once your `DATABASE_URL` and `DIRECT_URL` are set in `.env.local`:
```bash
npx prisma db push
```

---

## 5. Live Connection Verification in the App

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to **Settings** in the sidebar:
   - Click the **"Supabase & Database"** tab.
   - Click **"Test Connection"**.
   - You will see real-time latency diagnostics and verification that your database is connected and responsive!

---

## 6. Architecture Overview

```mermaid
flowchart LR
    Client[Next.js App / Client] -->|@supabase/supabase-js| SupabaseAPI[Supabase REST / Auth / Storage]
    Server[Next.js API / Server] -->|Prisma Client| SupabaseDB[(Supabase PostgreSQL Database)]
    SupabaseDB --> Pooler[PgBouncer Port 6543]
    SupabaseDB --> Direct[Direct Port 5432]
```

- **Client Connector**: [`src/lib/supabase.js`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/src/lib/supabase.js)
- **Prisma Connector**: [`src/lib/prisma.js`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/src/lib/prisma.js)
- **Prisma Schema**: [`prisma/schema.prisma`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/prisma/schema.prisma)
- **SQL DDL & Seed**: [`prisma/supabase_schema.sql`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/prisma/supabase_schema.sql)
- **Connection Health Check**: [`src/app/api/supabase/status/route.js`](file:///c:/Users/User-PC/Desktop/equipment%20and%20property%20system/src/app/api/supabase/status/route.js)
