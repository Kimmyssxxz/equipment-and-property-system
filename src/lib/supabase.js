import { createClient } from '@supabase/supabase-js';

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

export function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

export function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

/**
 * Checks whether the minimum required Supabase environment variables are present.
 */
export function isSupabaseConfigured() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(
    url &&
    url !== 'https://your-project.supabase.co' &&
    key &&
    key !== 'your-anon-key' &&
    key !== 'your-anon-public-key-here'
  );
}

/**
 * Client-safe Supabase instance (uses anonymous / publishable key).
 */
export function getSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!isSupabaseConfigured()) return null;

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;

/**
 * Server-only Supabase instance with Service Role bypass privileges.
 * Only call this inside server contexts (API routes, server actions, getServerSideProps).
 */
export function getServiceSupabase() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  const key = serviceKey || getSupabaseKey();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Tests live connectivity to Supabase.
 * Returns { success: boolean, latencyMs: number, message: string, details?: any }
 */
export async function testSupabaseConnection() {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      latencyMs: 0,
      configured: false,
      message: 'Supabase credentials not configured in .env.local',
      error: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.',
    };
  }

  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  const startTime = Date.now();

  try {
    const client = createClient(url, key);
    // Simple query to probe Supabase REST endpoint
    const { data, error } = await client
      .from('roles')
      .select('id, name')
      .limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      // If table doesn't exist yet (42P01 / PGRST204 / 404), connection to Supabase was still successful!
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return {
          success: true,
          latencyMs,
          configured: true,
          tablesReady: false,
          message: 'Connected to Supabase successfully, but database tables are not yet created.',
          details: 'Run prisma/supabase_schema.sql in the Supabase SQL Editor to create tables.',
        };
      }
      return {
        success: false,
        latencyMs,
        configured: true,
        message: `Supabase query failed: ${error.message}`,
        error: error,
      };
    }

    return {
      success: true,
      latencyMs,
      configured: true,
      tablesReady: true,
      message: 'Connected to Supabase successfully and database tables are responsive!',
      sampleData: data,
    };
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      configured: true,
      message: `Connection error: ${err.message}`,
      error: err.toString(),
    };
  }
}
