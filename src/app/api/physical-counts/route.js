import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getSessionUser, extractEncoderFromRemarks } from '@/lib/auth';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch physical counts from Supabase Database (User-Scoped)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const sessionUser = await getSessionUser(request);
    const targetUsername = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : null;

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

    // Parallel fetch master properties for rich joins
    const { data: properties } = await supabase.from('properties').select('*');

    const propMap = new Map();
    (properties || []).forEach((p) => {
      const pId = p.id ? String(p.id).trim() : null;
      const pNum = (p.propertyNumber || p.property_number || p.propertyNo || p.property_no || p.code || '').trim();
      const pNumClean = pNum.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (pId) {
        propMap.set(pId, p);
        propMap.set(pId.toLowerCase(), p);
      }
      if (pNum) {
        propMap.set(pNum, p);
        propMap.set(pNum.toLowerCase(), p);
      }
      if (pNumClean) {
        propMap.set(pNumClean, p);
      }
    });

    const getProp = (c) => {
      const cPropId = c.propertyId || c.property_id || c.propertyid;
      const cPropNum = c.propertyNumber || c.property_number || c.scannedCode || c.scanned_code || '';
      const cPropNumClean = String(cPropNum).toLowerCase().replace(/[^a-z0-9]/g, '');

      return (
        (cPropId ? propMap.get(String(cPropId)) : null) ||
        (cPropId ? propMap.get(String(cPropId).toLowerCase()) : null) ||
        (cPropNum ? propMap.get(String(cPropNum)) : null) ||
        (cPropNum ? propMap.get(String(cPropNum).toLowerCase()) : null) ||
        (cPropNumClean ? propMap.get(cPropNumClean) : null) ||
        {}
      );
    };

    const formatted = (rawCounts || []).map((c) => {
      const prop = getProp(c);
      const expected = c.quantityPerCard || c.quantity_per_card || prop.quantityPerCard || prop.quantity_per_card || prop.quantity || 1;
      const actual = c.physicalCount !== undefined && c.physicalCount !== null ? c.physicalCount : c.physical_count;
      const diff = actual !== null && actual !== undefined ? actual - expected : null;
      const creator = c.createdBy || c.created_by || prop.createdBy || prop.created_by || 'edolotallas';

      let stat = c.status || 'PENDING';
      if (actual !== null && actual !== undefined) {
        if (diff === 0) stat = 'OK';
        else if (diff < 0) stat = 'SHORTAGE';
        else if (diff > 0) stat = 'OVERAGE';
      }

      const propNumber =
        (prop.propertyNumber && prop.propertyNumber !== 'N/A' && prop.propertyNumber !== 'Asset')
          ? prop.propertyNumber
          : prop.property_number ||
            prop.propertyNo ||
            prop.property_no ||
            prop.code ||
            (c.propertyNumber && c.propertyNumber !== 'N/A' && c.propertyNumber !== 'Asset' ? c.propertyNumber : '') ||
            c.property_number ||
            c.scannedCode ||
            c.scanned_code ||
            'N/A';

      const article =
        (prop.article && prop.article !== 'Asset' && prop.article !== 'Equipment Item')
          ? prop.article
          : prop.name ||
            prop.title ||
            (c.article && c.article !== 'Asset' && c.article !== 'Equipment Item' ? c.article : '') ||
            c.name ||
            'Equipment Item';

      const description =
        prop.description ||
        prop.desc ||
        c.description ||
        '';

      const categoryId =
        prop.categoryId ||
        prop.category_id ||
        c.categoryId ||
        c.category_id;

      return {
        id: c.id,
        sessionId: c.sessionId || c.session_id,
        propertyId: c.propertyId || c.property_id || prop.id,
        propertyNumber,
        article,
        description,
        categoryId,
        unit: prop.unit || c.unit || 'unit',
        unitValue: prop.unitValue || prop.unit_value || c.unitValue || c.unit_value || 0,
        quantityPerCard: expected,
        physicalCount: actual,
        difference: diff,
        status: stat,
        remarks: c.remarks || '',
        createdBy: creator,
        encodedBy: creator,
        countedAt: c.countedAt || c.counted_at,
        countedBy: c.countedBy || c.counted_by,
        createdAt: c.createdAt || c.created_at,
        updatedAt: c.updatedAt || c.updated_at,
      };
    });

    let filtered = formatted;
    if (targetUsername) {
      filtered = formatted.filter((c) => {
        const prop =
          (c.propertyId ? propMap.get(String(c.propertyId)) : null) ||
          (c.propertyId ? propMap.get(String(c.propertyId).toLowerCase()) : null) ||
          (c.propertyNumber ? propMap.get(String(c.propertyNumber)) : null) ||
          {};
        const propCreator = (prop.createdBy || prop.created_by || extractEncoderFromRemarks(prop.remarks) || 'edolotallas').toLowerCase().trim();
        const countUser = (c.countedBy || c.createdBy || '').toLowerCase().trim();

        if (targetUsername === 'queenie_ppsc') {
          return propCreator === 'queenie_ppsc' || propCreator.includes('queenie') || countUser.includes('queenie');
        } else if (targetUsername === 'edolotallas') {
          return (propCreator === 'edolotallas' || (!propCreator.includes('queenie') && propCreator !== 'queenie_ppsc')) && !countUser.includes('queenie');
        }
        return true;
      });
    }

    return NextResponse.json({ success: true, counts: filtered }, { status: 200 });
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
    const cleanPropId =
      propertyId && typeof propertyId === 'string' && (propertyId.startsWith('temp-') || propertyId.startsWith('pending-'))
        ? propertyId.replace(/^(temp-|pending-)/, '')
        : propertyId;

    if (cleanPropId) {
      const { data } = await supabase.from('properties').select('*').eq('id', cleanPropId).maybeSingle();
      targetProp = data;
    }

    if (!targetProp && propNumber) {
      // First try exact / ilike match on propertyNumber or id
      const { data: matched } = await supabase
        .from('properties')
        .select('*')
        .or(`propertyNumber.ilike.${propNumber},id.eq.${propNumber}`)
        .maybeSingle();
      targetProp = matched;

      // Fallback: in-memory alphanumeric match across all properties
      if (!targetProp) {
        const { data: allProps } = await supabase.from('properties').select('*');
        const cleanAlpha = String(propNumber).toLowerCase().replace(/[^a-z0-9]/g, '');
        targetProp = (allProps || []).find((p) => {
          const pNum = (p.propertyNumber || p.id || '').toLowerCase();
          const pNumClean = pNum.replace(/[^a-z0-9]/g, '');
          return pNum === String(propNumber).toLowerCase() || (cleanAlpha && pNumClean === cleanAlpha);
        });
      }
    }

    // 2. Check for existing physical count
    let existingCount = null;
    const cleanCountId =
      countId && typeof countId === 'string' && !countId.startsWith('temp-') && !countId.startsWith('pending-')
        ? countId
        : null;

    if (cleanCountId) {
      const { data } = await supabase.from('physical_counts').select('*').eq('id', cleanCountId).maybeSingle();
      existingCount = data;
      if (!targetProp && existingCount?.propertyId) {
        const { data: p } = await supabase.from('properties').select('*').eq('id', existingCount.propertyId).maybeSingle();
        targetProp = p;
      }
    }

    if (!existingCount && targetProp) {
      const { data } = await supabase
        .from('physical_counts')
        .select('*')
        .eq('sessionId', sessionId)
        .eq('propertyId', targetProp.id)
        .maybeSingle();
      existingCount = data;
    }

    if (!existingCount && targetProp) {
      const { data } = await supabase
        .from('physical_counts')
        .select('*')
        .eq('propertyId', targetProp.id)
        .maybeSingle();
      if (data) {
        existingCount = data;
      }
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
    const sessionUser = await getSessionUser(request);
    const activeUserName = sessionUser?.fullName || sessionUser?.username || 'Admin';
    const finalCountedBy = countedBy || activeUserName;

    if (existingCount) {
      const updatePayload = {
        sessionId,
        propertyId: targetProp ? targetProp.id : existingCount.propertyId,
        physicalCount: countVal,
        difference,
        status,
        remarks: remarks !== undefined ? remarks : existingCount.remarks || 'In good working condition',
        countedAt: new Date().toISOString(),
        countedBy: finalCountedBy,
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
      const activeUsername = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : 'edolotallas';

      const newCountPayload = {
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sessionId,
        propertyId: targetProp.id,
        quantityPerCard: expectedQty,
        physicalCount: countVal,
        difference,
        status,
        remarks: remarks || 'In good working condition',
        countedAt: new Date().toISOString(),
        countedBy: finalCountedBy,
        createdBy: activeUsername,
      };

      let { data: inserted, error: insertError } = await supabase
        .from('physical_counts')
        .insert([newCountPayload])
        .select()
        .single();

      if (insertError) {
        // Fallback: If unique constraint on (sessionId, propertyId) was triggered, update instead
        const { data: retryUpdate, error: retryErr } = await supabase
          .from('physical_counts')
          .update({
            physicalCount: countVal,
            difference,
            status,
            remarks: remarks || 'In good working condition',
            countedAt: new Date().toISOString(),
            countedBy: finalCountedBy,
            updatedAt: new Date().toISOString(),
          })
          .eq('sessionId', sessionId)
          .eq('propertyId', targetProp.id)
          .select()
          .single();

        if (!retryErr && retryUpdate) {
          inserted = retryUpdate;
          insertError = null;
        }
      }

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
          userName: finalCountedBy || 'Admin',
          action: 'PHYSICAL_COUNT',
          entity: 'Physical Count',
          entityId: formatted.id,
          details: `Verified ${formatted.propertyNumber} (${formatted.article}): Counted ${countVal}/${expectedQty} -> ${status}`,
        },
      ]);
    } catch (e) {}

    return NextResponse.json(
      {
        success: true,
        count: formatted,
        isNewScan: !existingCount || existingCount.physicalCount === null,
      },
      { status: 200 }
    );
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
