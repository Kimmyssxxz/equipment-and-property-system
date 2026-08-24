import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch recent system audit logs from Supabase Database
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, logs: [] }, { status: 200 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ success: true, logs: [] }, { status: 200 });
    }

    // Try fetching from audit_logs table
    const { data: logsData, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(30);

    if (!error && logsData && logsData.length > 0) {
      const formatted = logsData.map((item) => ({
        id: item.id,
        date: item.createdAt
          ? `${item.createdAt.slice(0, 10)} ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : new Date().toISOString().slice(0, 10),
        user: item.userName || item.user || 'Admin',
        action: item.action || 'SYSTEM_ACTION',
        entity: item.entity || 'Property Registry',
        details: item.details || 'Official system action executed.',
      }));
      return NextResponse.json({ success: true, logs: formatted }, { status: 200 });
    }

    // Fallback: Build audit logs dynamically from recent property assignments
    const { data: assignments } = await supabase
      .from('property_assignments')
      .select('*, properties(propertyNumber, article)')
      .order('createdAt', { ascending: false })
      .limit(20);

    if (assignments && assignments.length > 0) {
      const formatted = assignments.map((asgn) => ({
        id: asgn.id,
        date: asgn.createdAt
          ? `${asgn.createdAt.slice(0, 10)} ${new Date(asgn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : new Date().toISOString().slice(0, 10),
        user: asgn.transferredBy || 'Admin',
        action: 'PROPERTY_ASSIGNMENT',
        entity: 'Property Accountability',
        details: `Assigned item "${asgn.properties?.article || asgn.properties?.propertyNumber || 'Asset'}" (${asgn.properties?.propertyNumber || ''})`,
      }));
      return NextResponse.json({ success: true, logs: formatted }, { status: 200 });
    }

    return NextResponse.json({ success: true, logs: [] }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message, logs: [] }, { status: 500 });
  }
}
