import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch physical counts from Supabase Database
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured.', configured: false, counts: [] },
        { status: 200 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.', counts: [] }, { status: 500 });
    }

    let query = supabase.from('physical_counts').select('*');
    if (sessionId) {
      query = query.eq('sessionId', sessionId);
    }

    const { data: rawCounts, error: cntError } = await query;

    if (cntError) {
      if (
        cntError.code === '42P01' ||
        cntError.code === 'PGRST205' ||
        (cntError.message && cntError.message.toLowerCase().includes('relation "physical_counts" does not exist'))
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'The "physical_counts" table does not exist in the database yet. Please run the SQL schema.',
            counts: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: cntError.message, counts: [] }, { status: 400 });
    }

    // Parallel fetch master properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id, propertyNumber, article, description, categoryId, unit, unitValue, quantityPerCard');

    const propMap = new Map((properties || []).map((p) => [p.id, p]));

    const formatted = (rawCounts || []).map((c) => {
      const prop = propMap.get(c.propertyId) || {};
      const expected = c.quantityPerCard || prop.quantityPerCard || 1;
      const actual = c.physicalCount;
      const diff = actual !== null && actual !== undefined ? actual - expected : null;

      let stat = c.status || 'PENDING';
      if (actual !== null && actual !== undefined) {
        if (diff === 0) stat = 'OK';
        else if (diff < 0) stat = 'SHORTAGE';
        else if (diff > 0) stat = 'OVERAGE';
      }

      return {
        id: c.id,
        sessionId: c.sessionId,
        propertyId: c.propertyId,
        propertyNumber: prop.propertyNumber || c.propertyNumber || 'N/A',
        article: prop.article || c.article || 'Asset',
        description: prop.description || c.description || '',
        categoryId: prop.categoryId,
        unit: prop.unit || 'unit',
        unitValue: prop.unitValue || 0,
        quantityPerCard: expected,
        physicalCount: actual,
        difference: diff,
        status: stat,
        remarks: c.remarks || '',
        countedAt: c.countedAt,
        countedBy: c.countedBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ success: true, counts: formatted }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, counts: [] }, { status: 500 });
  }
}

// POST: Scan sticker / record physical count into Supabase Database
export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionId, scannedCode, countId, propertyId, physicalCount, remarks, countedBy } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    // 1. Resolve Property
    let propNumber = '';
    if (scannedCode) {
      let raw = String(scannedCode).trim();
      if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const parsed = JSON.parse(raw);
          propNumber = parsed.propertyNumber || parsed.property_number || parsed.id || raw;
        } catch (e) {
          propNumber = raw;
        }
      } else {
        propNumber = raw;
      }
    }

    let targetProp = null;
    if (propertyId) {
      const { data } = await supabase.from('properties').select('*').eq('id', propertyId).maybeSingle();
      targetProp = data;
    } else if (propNumber) {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .or(`propertyNumber.ilike.${propNumber},id.eq.${propNumber}`)
        .maybeSingle();
      targetProp = data;
    }

    // If property not found in database, check existing physical_counts by countId
    let existingCount = null;
    if (countId) {
      const { data } = await supabase.from('physical_counts').select('*').eq('id', countId).maybeSingle();
      existingCount = data;
      if (!targetProp && existingCount?.propertyId) {
        const { data: p } = await supabase.from('properties').select('*').eq('id', existingCount.propertyId).maybeSingle();
        targetProp = p;
      }
    } else if (targetProp) {
      const { data } = await supabase
        .from('physical_counts')
        .select('*')
        .eq('sessionId', sessionId)
        .eq('propertyId', targetProp.id)
        .maybeSingle();
      existingCount = data;
    }

    if (!targetProp && !existingCount) {
      return NextResponse.json(
        { error: `Property with code "${scannedCode || propertyId || countId}" was not found in the registry.` },
        { status: 404 }
      );
    }

    const expectedQty = existingCount ? (existingCount.quantityPerCard || 1) : (targetProp ? (targetProp.quantityPerCard || 1) : 1);
    const countVal = physicalCount !== null && physicalCount !== undefined ? parseInt(physicalCount, 10) : expectedQty;

    if (isNaN(countVal) || countVal < 0) {
      return NextResponse.json({ error: 'Physical count must be a non-negative number.' }, { status: 400 });
    }

    const difference = countVal - expectedQty;
    let status = 'OK';
    if (difference < 0) status = 'SHORTAGE';
    else if (difference > 0) status = 'OVERAGE';

    let finalCount;

    if (existingCount) {
      const updatePayload = {
        physicalCount: countVal,
        difference,
        status,
        remarks: remarks !== undefined ? remarks : existingCount.remarks || 'Scanned from property sticker',
        countedAt: new Date().toISOString(),
        countedBy: countedBy || 'Admin',
        updatedAt: new Date().toISOString(),
      };

      const { data: updated, error: updateError } = await supabase
        .from('physical_counts')
        .update(updatePayload)
        .eq('id', existingCount.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      finalCount = updated;
    } else {
      const newCountPayload = {
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sessionId,
        propertyId: targetProp.id,
        quantityPerCard: expectedQty,
        physicalCount: countVal,
        difference,
        status,
        remarks: remarks || 'Scanned from property sticker',
        countedAt: new Date().toISOString(),
        countedBy: countedBy || 'Admin',
      };

      const { data: inserted, error: insertError } = await supabase
        .from('physical_counts')
        .insert([newCountPayload])
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
      finalCount = inserted;
    }

    // Format full response
    const formatted = {
      ...finalCount,
      propertyNumber: targetProp?.propertyNumber || propNumber,
      article: targetProp?.article || 'Asset',
      description: targetProp?.description || '',
      unit: targetProp?.unit || 'unit',
      unitValue: targetProp?.unitValue || 0,
      quantityPerCard: expectedQty,
      physicalCount: countVal,
      difference,
      status,
    };

    // Audit log
    try {
      await supabase.from('audit_logs').insert([
        {
          id: `log_${Date.now()}`,
          userName: countedBy || 'Admin',
          action: 'PHYSICAL_COUNT',
          entity: 'Physical Count',
          entityId: formatted.id,
          details: `Verified ${formatted.propertyNumber} (${formatted.article}): Counted ${countVal}/${expectedQty} -> ${status}`,
        },
      ]);
    } catch (e) {}

    return NextResponse.json({ success: true, count: formatted, isNewScan: !existingCount || existingCount.physicalCount === null }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Reset count item to pending status
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countId = searchParams.get('countId');

    if (!countId) {
      return NextResponse.json({ error: 'Count ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    const resetPayload = {
      physicalCount: null,
      difference: null,
      status: 'PENDING',
      remarks: '',
      countedAt: null,
      countedBy: null,
      updatedAt: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('physical_counts')
      .update(resetPayload)
      .eq('id', countId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: updated }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
