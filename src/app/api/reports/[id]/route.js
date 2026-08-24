import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch a single report by ID from Supabase Database
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured.', configured: false },
        { status: 200 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    let { data: rawReport } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!rawReport) {
      const { data: byNum } = await supabase
        .from('reports')
        .select('*')
        .eq('reportNumber', id)
        .maybeSingle();
      rawReport = byNum;
    }

    if (!rawReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Lookup employee and office
    const [empRes, offRes, sessRes] = await Promise.all([
      supabase.from('employees').select('id, name, employeeId, position, assumedDate').eq('id', rawReport.accountablePersonId).maybeSingle(),
      supabase.from('offices').select('id, code, name, head').eq('id', rawReport.officeId).maybeSingle(),
      rawReport.inventorySessionId
        ? supabase.from('inventory_sessions').select('id, sessionCode, title, asOfDate').eq('id', rawReport.inventorySessionId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const emp = empRes?.data || {};
    const off = offRes?.data || {};
    const sess = sessRes?.data || null;

    const items = Array.isArray(rawReport.snapshotData)
      ? rawReport.snapshotData
      : Array.isArray(rawReport.itemsSnapshot)
      ? rawReport.itemsSnapshot
      : [];

    const totalVal = items.reduce(
      (sum, item) => sum + (parseFloat(item.unitValue) || 0) * (parseInt(item.quantityPerCard, 10) || 1),
      0
    );
    const shortageVal = items
      .filter((i) => i.status === 'SHORTAGE')
      .reduce((sum, item) => sum + (parseFloat(item.unitValue) || 0) * Math.abs(parseInt(item.difference, 10) || 1), 0);
    const overageVal = items
      .filter((i) => i.status === 'OVERAGE')
      .reduce((sum, item) => sum + (parseFloat(item.unitValue) || 0) * (parseInt(item.difference, 10) || 1), 0);

    const cleanAsOf = rawReport.asOfDate
      ? (String(rawReport.asOfDate).includes('T') ? String(rawReport.asOfDate).slice(0, 10) : String(rawReport.asOfDate))
      : '2026-12-31';

    const formatted = {
      id: rawReport.id,
      reportNumber: rawReport.reportNumber,
      reportType: rawReport.reportType,
      title: rawReport.title,
      asOfDate: cleanAsOf,
      accountablePersonId: rawReport.accountablePersonId,
      accountablePersonName: emp.name || rawReport.accountablePersonName || 'ELMER G. DOLOTALLAS',
      accountablePosition: emp.position || rawReport.accountablePosition || 'Supply Officer',
      assumedDate: emp.assumedDate || '2021-01-15',
      officeId: rawReport.officeId,
      officeName: off.name || rawReport.officeName || 'Supply Office',
      inventorySessionId: rawReport.inventorySessionId,
      inventorySessionCode: sess ? sess.sessionCode : rawReport.inventorySessionCode || 'DIRECT-GEN',
      generatedDate: rawReport.createdAt ? new Date(rawReport.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      generatedBy: rawReport.generatedBy || 'Admin',
      status: rawReport.status || 'FINALIZED',
      signatories: rawReport.signatories || {},
      itemsCount: items.length,
      totalValue: totalVal,
      shortageValue: shortageVal,
      overageValue: overageVal,
      snapshotData: items,
      itemsSnapshot: items,
      createdAt: rawReport.createdAt,
      updatedAt: rawReport.updatedAt,
    };

    return NextResponse.json({ success: true, report: formatted }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH / PUT: Update report signatories or status in Supabase
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { signatories, status, title } = body;

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    const updatePayload = {
      updatedAt: new Date().toISOString(),
    };

    if (signatories) updatePayload.signatories = signatories;
    if (status) updatePayload.status = status;
    if (title) updatePayload.title = title;

    const { data: updated, error } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, report: updated }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
