import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all inventory sessions from Supabase Database
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured.', configured: false, sessions: [] },
        { status: 200 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not initialized.', sessions: [] },
        { status: 500 }
      );
    }

    let query = supabase
      .from('inventory_sessions')
      .select('*')
      .order('createdAt', { ascending: false });

    if (sessionId) {
      query = query.eq('id', sessionId);
    }

    const { data: rawSessions, error: sessError } = await query;

    if (sessError) {
      if (
        sessError.code === '42P01' ||
        sessError.code === 'PGRST205' ||
        (sessError.message && sessError.message.toLowerCase().includes('relation "inventory_sessions" does not exist'))
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'The "inventory_sessions" table does not exist in the database yet. Please run the SQL schema.',
            sessions: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: sessError.message, sessions: [] }, { status: 400 });
    }

    // Parallel fetch lookups
    const [empRes, offRes] = await Promise.all([
      supabase.from('employees').select('id, name, employeeId, position'),
      supabase.from('offices').select('id, code, name, head'),
    ]);

    const empMap = new Map((empRes.data || []).map((e) => [e.id, e]));
    const offMap = new Map((offRes.data || []).map((o) => [o.id, o]));

    const formatted = (rawSessions || []).map((s) => {
      const invPerson = s.inventoryPerson || s.accountableOfficerName || s.finalizedBy || 'All Personnel';

      const cleanAsOf = s.asOfDate
        ? (String(s.asOfDate).includes('T') ? String(s.asOfDate).slice(0, 10) : String(s.asOfDate))
        : '2026-12-31';

      const cleanCounting = s.countingDate
        ? (String(s.countingDate).includes('T') ? String(s.countingDate).slice(0, 10) : String(s.countingDate))
        : new Date().toISOString().slice(0, 10);

      return {
        id: s.id,
        sessionCode: s.sessionCode,
        title: s.title,
        asOfDate: cleanAsOf,
        countingDate: cleanCounting,
        inventoryPerson: invPerson,
        inventoryPersonName: invPerson,
        accountableOfficerName: invPerson,
        categoryFilter: s.categoryFilter || 'ALL',
        status: s.status || 'IN_PROGRESS',
        remarks: s.remarks || '',
        finalizedAt: s.finalizedAt,
        finalizedBy: s.finalizedBy,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    if (sessionId && formatted.length > 0) {
      return NextResponse.json({ success: true, session: formatted[0] }, { status: 200 });
    }

    return NextResponse.json({ success: true, sessions: formatted }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, sessions: [] }, { status: 500 });
  }
}

// POST: Create a new inventory session block in Supabase Database
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      sessionCode,
      title,
      asOfDate,
      countingDate,
      inventoryPerson,
      officeId,
      categoryFilter,
      remarks,
    } = body;

    const cleanInventoryPerson = inventoryPerson && typeof inventoryPerson === 'string' && inventoryPerson.trim() 
      ? inventoryPerson.trim() 
      : 'All Personnel';

    if (!sessionCode || !title) {
      return NextResponse.json(
        { error: 'Session Code and Session Title are required.' },
        { status: 400 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    const cleanCode = sessionCode.trim().toUpperCase();
    const cleanTitle = title.trim();

    // Check code uniqueness
    const { data: existing } = await supabase
      .from('inventory_sessions')
      .select('id')
      .eq('sessionCode', cleanCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Inventory session code "${cleanCode}" is already in use.` },
        { status: 400 }
      );
    }

    const cleanAsOf = asOfDate
      ? (String(asOfDate).includes('T') ? String(asOfDate).slice(0, 10) : String(asOfDate))
      : new Date().toISOString().slice(0, 10);

    const cleanCounting = countingDate
      ? (String(countingDate).includes('T') ? String(countingDate).slice(0, 10) : String(countingDate))
      : new Date().toISOString().slice(0, 10);

    const sessionPayload = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionCode: cleanCode,
      title: cleanTitle,
      asOfDate: new Date(cleanAsOf).toISOString(),
      countingDate: new Date(cleanCounting).toISOString(),
      inventoryPerson: cleanInventoryPerson,
      categoryFilter: categoryFilter || 'ALL',
      status: 'IN_PROGRESS',
      remarks: remarks || '',
    };

    const { data: insertedSession, error: insertError } = await supabase
      .from('inventory_sessions')
      .insert([sessionPayload])
      .select()
      .single();

    if (insertError) {
      if (
        insertError.code === '42P01' ||
        insertError.code === 'PGRST205' ||
        (insertError.message && insertError.message.toLowerCase().includes('relation "inventory_sessions" does not exist'))
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'The "inventory_sessions" table does not exist in the database yet. Please run the SQL schema.',
            session: sessionPayload,
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // 2. Fetch properties to populate physical counts
    let propQuery = supabase.from('properties').select('*');
    if (officeId && officeId !== 'ALL') {
      propQuery = propQuery.eq('officeId', officeId);
    }
    if (categoryFilter && categoryFilter !== 'ALL') {
      propQuery = propQuery.eq('categoryId', categoryFilter);
    }

    const { data: matchingProps } = await propQuery;

    let initialCounts = [];
    if (matchingProps && matchingProps.length > 0) {
      const countRows = matchingProps.map((p) => ({
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sessionId: insertedSession.id,
        propertyId: p.id,
        quantityPerCard: p.quantityPerCard || 1,
        physicalCount: null,
        difference: null,
        status: 'PENDING',
        remarks: '',
      }));

      try {
        const { data: insertedCounts } = await supabase
          .from('physical_counts')
          .insert(countRows)
          .select();
        initialCounts = insertedCounts || [];
      } catch (cntErr) {
        console.warn('Physical count initialization notice:', cntErr);
      }
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert([
        {
          id: `log_${Date.now()}`,
          userName: 'Admin',
          action: 'CREATE_SESSION',
          entity: 'Inventory Session',
          entityId: insertedSession.id,
          details: `Created inventory session [${cleanCode}] "${cleanTitle}" with ${initialCounts.length} assigned properties`,
        },
      ]);
    } catch (e) {}

    return NextResponse.json(
      { success: true, session: insertedSession, counts: initialCounts },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update session details
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, sessionCode, title, asOfDate, countingDate, remarks, status, finalizedBy } = body;

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    const updatePayload = {
      updatedAt: new Date().toISOString(),
    };

    if (sessionCode) updatePayload.sessionCode = sessionCode.trim().toUpperCase();
    if (title) updatePayload.title = title.trim();
    if (asOfDate) updatePayload.asOfDate = new Date(asOfDate).toISOString();
    if (countingDate) updatePayload.countingDate = new Date(countingDate).toISOString();
    if (remarks !== undefined) updatePayload.remarks = remarks;
    if (status) {
      updatePayload.status = status;
      if (status === 'FINALIZED') {
        updatePayload.finalizedAt = new Date().toISOString();
        updatePayload.finalizedBy = finalizedBy || 'Admin';
      }
    }

    const { data: updated, error } = await supabase
      .from('inventory_sessions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: updated }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete inventory session
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    // Delete associated physical counts first
    await supabase.from('physical_counts').delete().eq('sessionId', id);

    const { error } = await supabase.from('inventory_sessions').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Session deleted successfully.' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
