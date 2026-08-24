import { NextResponse } from 'next/server';
import { isSupabaseConfigured, testSupabaseConnection } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const configured = isSupabaseConfigured();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const hasAnonKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);

  if (!configured) {
    return NextResponse.json({
      success: false,
      configured: false,
      message: 'Supabase credentials are not yet configured in .env.local',
      diagnostics: {
        hasUrl: Boolean(rawUrl),
        hasAnonKey,
        hasServiceKey,
        hasDatabaseUrl,
        hasDirectUrl,
      },
    });
  }

  // Test Supabase REST client
  const supabaseResult = await testSupabaseConnection();

  // Test Prisma PostgreSQL connection if DATABASE_URL is configured
  let prismaResult = { connected: false, message: 'Prisma not tested' };
  if (hasDatabaseUrl && !process.env.DATABASE_URL.includes('your-password')) {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      prismaResult = {
        connected: true,
        latencyMs: Date.now() - startTime,
        message: 'Prisma connected to Supabase PostgreSQL database successfully',
      };
    } catch (prismaErr) {
      prismaResult = {
        connected: false,
        message: `Prisma connection failed: ${prismaErr.message}`,
        error: prismaErr.message,
      };
    }
  }

  return NextResponse.json({
    success: supabaseResult.success,
    configured: true,
    supabaseUrl: rawUrl,
    supabase: supabaseResult,
    prisma: prismaResult,
    diagnostics: {
      hasUrl: Boolean(rawUrl),
      hasAnonKey,
      hasServiceKey,
      hasDatabaseUrl,
      hasDirectUrl,
    },
  });
}
