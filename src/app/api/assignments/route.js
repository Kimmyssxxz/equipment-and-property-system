import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all property assignment records from Supabase Database
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Database is not configured yet. Check .env.local.',
          configured: false,
          assignments: [],
        },
        { status: 500 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize database client.', assignments: [] },
        { status: 500 }
      );
    }

    // 1. Fetch assignment records directly
    const { data: assignments, error: asgnError } = await supabase
      .from('property_assignments')
      .select('*')
      .order('assignmentDate', { ascending: false });

    if (asgnError) {
      if (
        asgnError.code === '42P01' ||
        asgnError.code === 'PGRST205' ||
        (asgnError.message && asgnError.message.toLowerCase().includes('relation "property_assignments" does not exist'))
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error:
              'The "property_assignments" table does not exist in the database yet. Please run the SQL schema in your SQL Editor.',
            assignments: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: asgnError.message, assignments: [] }, { status: 400 });
    }

    // 2. Fetch lookup records in parallel for robust in-memory relation mapping
    const [propRes, empRes, offRes] = await Promise.all([
      supabase
        .from('properties')
        .select('id, propertyNumber, article, description, unitValue, poNumber, categoryId, status, unit, serialNumber'),
      supabase
        .from('employees')
        .select('id, name, employeeId, position, officeId'),
      supabase
        .from('offices')
        .select('id, code, name, head'),
    ]);

    const propMap = new Map((propRes.data || []).map((p) => [p.id, p]));
    const empMap = new Map((empRes.data || []).map((e) => [e.id, e]));
    const offMap = new Map((offRes.data || []).map((o) => [o.id, o]));

    // 3. Format fields cleanly
    const formatted = (assignments || []).map((item) => {
      const prop = propMap.get(item.propertyId) || {};
      const emp = empMap.get(item.employeeId) || {};
      const off = offMap.get(item.officeId) || {};
      const prevEmp = item.previousEmployeeId ? empMap.get(item.previousEmployeeId) : null;
      const prevOff = item.previousOfficeId ? offMap.get(item.previousOfficeId) : null;

      const cleanDate = item.assignmentDate
        ? (item.assignmentDate.includes('T') ? item.assignmentDate.slice(0, 10) : item.assignmentDate)
        : new Date(item.createdAt || Date.now()).toISOString().slice(0, 10);

      return {
        id: item.id,
        propertyId: item.propertyId,
        propertyNumber: prop.propertyNumber || item.propertyNumber || 'N/A',
        article: prop.article || item.article || 'Asset',
        description: prop.description || '',
        serialNumber: prop.serialNumber || item.serialNumber || '',
        unitValue: prop.unitValue || 0,
        unit: prop.unit || 'unit',
        poNumber: prop.poNumber || '',

        employeeId: item.employeeId,
        employeeName: emp.name || item.employeeName || 'Assigned Officer',
        employeePosition: emp.position || '',
        employeeCode: emp.employeeId || '',
        officeId: item.officeId,
        officeName: off.name || item.officeName || 'Assigned Office',
        officeCode: off.code || '',
        previousEmployeeId: item.previousEmployeeId,
        previousEmployeeName: prevEmp?.name || (item.previousEmployeeId ? 'Previous Custodian' : 'None (Initial Registration)'),
        previousEmployeePosition: prevEmp?.position || '',
        previousOfficeId: item.previousOfficeId,
        previousOfficeName: prevOff?.name || (item.previousOfficeId ? 'Previous Office' : 'None (Initial Registration)'),
        assignmentDate: cleanDate,
        remarks: item.remarks || 'Official transfer of property accountability',
        transferredBy: item.transferredBy || 'System Admin',
        isActive: item.isActive !== false,
        createdAt: item.createdAt,
      };
    });

    return NextResponse.json({ success: true, assignments: formatted }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, assignments: [] }, { status: 500 });
  }
}

// POST: Create a new property assignment & update property active custodian in Database
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      newEmployeeId,
      employeeId,
      newOfficeId,
      officeId,
      assignmentDate,
      remarks,
      transferredBy,
    } = body;

    const targetPropertyId = (propertyId || '').trim();
    const targetEmployeeId = (newEmployeeId || employeeId || '').trim();
    const targetOfficeId = (newOfficeId || officeId || '').trim();

    if (!targetPropertyId || !targetOfficeId) {
      return NextResponse.json(
        { error: 'Property Unit and Deploying Area (Office ID) are required.' },
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

    // 1. Fetch current property state to know previous custodian and office
    const { data: currentProp, error: propFetchError } = await supabase
      .from('properties')
      .select('id, propertyNumber, article, accountablePersonId, officeId')
      .eq('id', targetPropertyId)
      .single();

    if (propFetchError && propFetchError.code !== 'PGRST116') {
      if (
        propFetchError.code === '42P01' ||
        propFetchError.code === 'PGRST205' ||
        (propFetchError.message && propFetchError.message.toLowerCase().includes('relation "properties" does not exist'))
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'Table "properties" does not exist in database. Please run the SQL schema first.',
          },
          { status: 400 }
        );
      }
    }

    const prevEmpId = currentProp?.accountablePersonId || null;
    const prevOffId = currentProp?.officeId || null;

    // 2. Deactivate previous active assignment records for this property
    try {
      await supabase
        .from('property_assignments')
        .update({ isActive: false })
        .eq('propertyId', targetPropertyId);
    } catch (e) {
      // Non-blocking
    }

    // 3. Insert new assignment record into property_assignments table
    const newAsgnId = 'asgn_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const parsedDate = assignmentDate
      ? new Date(assignmentDate).toISOString()
      : new Date().toISOString();

    const isUnassigned = !targetEmployeeId || targetEmployeeId === 'UNASSIGNED';
    const empIdForDb = isUnassigned ? null : targetEmployeeId;

    let newRecord = {
      id: newAsgnId,
      propertyId: targetPropertyId,
      employeeId: empIdForDb,
      officeId: targetOfficeId,
      previousEmployeeId: prevEmpId,
      previousOfficeId: prevOffId,
      assignmentDate: parsedDate,
      remarks: remarks ? remarks.trim() : 'Official transfer of property accountability',
      transferredBy: transferredBy ? transferredBy.trim() : 'System Admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    let { data: insertedAsgn, error: insertError } = await supabase
      .from('property_assignments')
      .insert([newRecord])
      .select('*')
      .single();

    // If null employeeId violated not-null or foreign key constraint, try with string fallback or handle cleanly
    if (insertError && isUnassigned) {
      newRecord.employeeId = 'UNASSIGNED';
      const retryRes = await supabase
        .from('property_assignments')
        .insert([newRecord])
        .select('*')
        .single();
      if (!retryRes.error) {
        insertedAsgn = retryRes.data;
        insertError = null;
      }
    }

    if (insertError) {
      if (
        insertError.code === '42P01' ||
        insertError.code === 'PGRST205' ||
        (insertError.message && insertError.message.toLowerCase().includes('relation "property_assignments" does not exist'))
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'Table "property_assignments" does not exist in database. Please run the SQL schema first.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: insertError.message || 'Failed to insert assignment record.' }, { status: 400 });
    }

    // 4. Update the active custodian pointer in properties table
    const { data: updatedProp, error: propUpdateError } = await supabase
      .from('properties')
      .update({
        accountablePersonId: empIdForDb,
        officeId: targetOfficeId,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', targetPropertyId)
      .select('*')
      .single();

    if (propUpdateError) {
      console.warn('Property custodian update notice:', propUpdateError.message);
    }

    // 5. Record in audit_logs table if accessible
    try {
      await supabase.from('audit_logs').insert([
        {
          id: 'log_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
          userName: transferredBy || 'Admin',
          action: 'REASSIGN_PROPERTY',
          entity: 'Property Assignment',
          entityId: targetPropertyId,
          details: `Reassigned property "${currentProp?.propertyNumber || targetPropertyId}" to employee ID ${targetEmployeeId}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      // non-blocking
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Property accountability successfully assigned and registered.',
        assignment: insertedAsgn || newRecord,
        property: updatedProp || null,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove an assignment history record if needed
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not initialized.' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase
      .from('property_assignments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: 'Assignment history record removed successfully.' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
