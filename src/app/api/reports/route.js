import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all official reports (RPCPPE, RPCI, RPCSP) from Supabase Database
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');
    const sessionId = searchParams.get('sessionId');
    const reportId = searchParams.get('id');

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Database is not configured yet. Check .env.local.',
          configured: false,
          reports: [],
        },
        { status: 200 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize database client.', reports: [] },
        { status: 500 }
      );
    }

    // 1. Fetch reports directly from Supabase
    let query = supabase
      .from('reports')
      .select('*')
      .order('createdAt', { ascending: false });

    if (reportId) {
      query = query.eq('id', reportId);
    }
    if (sessionId) {
      query = query.eq('inventorySessionId', sessionId);
    }

    const { data: rawReports, error: repError } = await query;

    if (repError) {
      if (
        repError.code === '42P01' ||
        repError.code === 'PGRST205' ||
        (repError.message && repError.message.toLowerCase().includes('relation "reports" does not exist'))
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error:
              'The "reports" table does not exist in the database yet. Please run the SQL schema in your SQL Editor.',
            reports: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: repError.message, reports: [] }, { status: 400 });
    }

    // 2. Fetch lookup records in parallel for robust in-memory relation mapping
    const [empRes, offRes, sessRes] = await Promise.all([
      supabase.from('employees').select('id, name, employeeId, position, assumedDate'),
      supabase.from('offices').select('id, code, name, head'),
      supabase.from('inventory_sessions').select('id, sessionCode, title, asOfDate'),
    ]);

    const empMap = new Map((empRes.data || []).map((e) => [e.id, e]));
    const offMap = new Map((offRes.data || []).map((o) => [o.id, o]));
    const sessMap = new Map((sessRes.data || []).map((s) => [s.id, s]));

    // 3. Format reports cleanly
    const formatted = (rawReports || []).map((r) => {
      const emp = empMap.get(r.accountablePersonId) || {};
      const off = offMap.get(r.officeId) || {};
      const sess = r.inventorySessionId ? sessMap.get(r.inventorySessionId) : null;

      const items = Array.isArray(r.snapshotData)
        ? r.snapshotData
        : Array.isArray(r.itemsSnapshot)
        ? r.itemsSnapshot
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

      const cleanAsOf = r.asOfDate
        ? (String(r.asOfDate).includes('T') ? String(r.asOfDate).slice(0, 10) : String(r.asOfDate))
        : '2026-12-31';

      return {
        id: r.id,
        reportNumber: r.reportNumber,
        reportType: r.reportType,
        title: r.title,
        asOfDate: cleanAsOf,
        accountablePersonId: r.accountablePersonId,
        accountablePersonName: emp.name || r.accountablePersonName || 'ELMER G. DOLOTALLAS',
        accountablePosition: emp.position || r.accountablePosition || 'Supply Officer',
        assumedDate: emp.assumedDate || '2021-01-15',
        officeId: r.officeId,
        officeName: off.name || r.officeName || 'Supply Office',
        inventorySessionId: r.inventorySessionId,
        inventorySessionCode: sess ? sess.sessionCode : r.inventorySessionCode || 'DIRECT-GEN',
        generatedDate: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        generatedBy: r.generatedBy || 'Admin',
        status: r.status || 'FINALIZED',
        signatories: r.signatories || {},
        itemsCount: items.length,
        totalValue: totalVal,
        shortageValue: shortageVal,
        overageValue: overageVal,
        snapshotData: items,
        itemsSnapshot: items, // Alias for maximum preview compatibility
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    if (reportId && formatted.length > 0) {
      return NextResponse.json({ success: true, report: formatted[0] }, { status: 200 });
    }

    return NextResponse.json({ success: true, reports: formatted }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, reports: [] }, { status: 500 });
  }
}

// POST: Create and Save a new official report (RPCPPE / RPCI / RPCSP) to Supabase Database
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id,
      reportNumber,
      reportType,
      title,
      asOfDate,
      accountablePersonId,
      officeId,
      categoryId,
      categoryName,
      inventorySessionId,
      generatedBy,
      status,
      signatories,
      snapshotData,
      itemsSnapshot,
    } = body;

    if (!accountablePersonId || !officeId) {
      return NextResponse.json(
        { error: 'Accountable Person and Assigned Office are required to generate the official report.' },
        { status: 400 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not initialized.' },
        { status: 500 }
      );
    }

    const finalReportType = reportType || 'REPORT ON PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)';
    const finalTitle =
      title ||
      (finalReportType.toUpperCase().startsWith('REPORT ON')
        ? finalReportType
        : `REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (${finalReportType.toUpperCase()})`);

    const finalReportNumber =
      reportNumber || `REP-2026-${String(Date.now()).slice(-4)}`;

    const finalItems = Array.isArray(snapshotData)
      ? snapshotData
      : Array.isArray(itemsSnapshot)
      ? itemsSnapshot
      : [];

    const cleanDate = asOfDate
      ? (String(asOfDate).includes('T') ? String(asOfDate).slice(0, 10) : String(asOfDate))
      : new Date().toISOString().slice(0, 10);

    let validEmpId = accountablePersonId;
    let validOffId = officeId;
    let validSessId = inventorySessionId || null;

    try {
      const [empCheck, offCheck, sessCheck] = await Promise.all([
        supabase.from('employees').select('id').eq('id', accountablePersonId).maybeSingle(),
        supabase.from('offices').select('id').eq('id', officeId).maybeSingle(),
        validSessId ? supabase.from('inventory_sessions').select('id').eq('id', validSessId).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (empCheck?.data?.id) validEmpId = empCheck.data.id;
      else {
        const { data: fallbackEmp } = await supabase.from('employees').select('id').limit(1).maybeSingle();
        if (fallbackEmp?.id) validEmpId = fallbackEmp.id;
      }

      if (offCheck?.data?.id) validOffId = offCheck.data.id;
      else {
        const { data: fallbackOff } = await supabase.from('offices').select('id').limit(1).maybeSingle();
        if (fallbackOff?.id) validOffId = fallbackOff.id;
      }

      if (validSessId && !sessCheck?.data?.id) {
        validSessId = null;
      }
    } catch (fkErr) {
      console.warn('FK resolution warning:', fkErr);
    }

    const reportPayload = {
      id: id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reportNumber: finalReportNumber,
      reportType: finalReportType,
      title: finalTitle,
      asOfDate: new Date(cleanDate).toISOString(),
      accountablePersonId: validEmpId,
      officeId: validOffId,
      inventorySessionId: validSessId,
      generatedBy: generatedBy || 'Admin',
      status: status || 'FINALIZED',
      signatories: {
        ...(signatories || {}),
        categoryId: categoryId || body.categoryId || null,
        categoryName: categoryName || body.categoryName || null,
      },
      snapshotData: finalItems,
    };

    const { data: insertedReport, error: insertError } = await supabase
      .from('reports')
      .insert([reportPayload])
      .select()
      .single();

    if (insertError) {
      console.warn('Report database insert warning/error:', insertError);
      if (
        insertError.code === '42P01' ||
        insertError.code === 'PGRST205' ||
        (insertError.message && insertError.message.toLowerCase().includes('schema cache')) ||
        (insertError.message && insertError.message.toLowerCase().includes('does not exist'))
      ) {
        return NextResponse.json(
          {
            success: true,
            tableMissing: true,
            message: 'Database table "reports" not found. Created report in memory.',
            report: {
              ...reportPayload,
              itemsSnapshot: finalItems,
              snapshotData: finalItems,
            },
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: insertError.message, details: insertError }, { status: 400 });
    }

    // Insert Audit Log entry
    try {
      await supabase.from('audit_logs').insert([
        {
          id: `log_${Date.now()}`,
          userName: generatedBy || 'Admin',
          action: 'GENERATE_REPORT',
          entity: 'Report',
          entityId: insertedReport.id,
          details: `Generated ${finalReportType} [${finalReportNumber}] for ${finalItems.length} properties.`,
        },
      ]);
    } catch (logErr) {
      // Non-blocking audit log error
      console.warn('Audit log write error:', logErr);
    }

    return NextResponse.json(
      {
        success: true,
        report: {
          ...insertedReport,
          itemsSnapshot: finalItems,
          snapshotData: finalItems,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove report from Supabase Database
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    const { error } = await supabase.from('reports').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert([
        {
          id: `log_${Date.now()}`,
          userName: 'Admin',
          action: 'DELETE_REPORT',
          entity: 'Report',
          entityId: id,
          details: `Deleted report record ${id}`,
        },
      ]);
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ success: true, message: 'Report deleted from database.' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
