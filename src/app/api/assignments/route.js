import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getSessionUser, extractEncoderFromRemarks } from '@/lib/auth';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all property assignment records from Supabase Database (User-Scoped)
export async function GET(request) {
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

    const sessionUser = await getSessionUser(request);
    const targetUsername = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : null;

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
        .select('id, propertyNumber, article, description, unitValue, poNumber, categoryId, status, unit, serialNumber, remarks, accountablePersonId, officeId, assignmentDate, acquisitionDate, createdAt'),
      supabase
        .from('employees')
        .select('id, name, employeeId, position, officeId'),
      supabase
        .from('offices')
        .select('id, code, name, head'),
    ]);

    const allProps = propRes.data || [];
    const allEmps = empRes.data || [];
    const allOffs = offRes.data || [];

    const propMap = new Map(allProps.map((p) => [p.id, p]));
    const empMap = new Map(allEmps.map((e) => [e.id, e]));
    const offMap = new Map(allOffs.map((o) => [o.id, o]));

    let filteredAssignments = assignments || [];

    // 3. Format fields cleanly for recorded transfers
    const formatted = filteredAssignments.map((item) => {
      const prop = propMap.get(item.propertyId) || {};
      const emp = empMap.get(item.employeeId) || {};
      const off = offMap.get(item.officeId) || {};
      const prevEmp = item.previousEmployeeId ? empMap.get(item.previousEmployeeId) : null;
      const prevOff = item.previousOfficeId ? offMap.get(item.previousOfficeId) : null;

      const cleanDate = item.assignmentDate
        ? (item.assignmentDate.includes('T') ? item.assignmentDate.slice(0, 10) : item.assignmentDate)
        : new Date(item.createdAt || Date.now()).toISOString().slice(0, 10);

      const creator = item.createdBy || item.created_by || 'edolotallas';

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
        categoryId: prop.categoryId || null,

        employeeId: item.employeeId,
        employeeName: (item.employeeId === 'emp_unassigned' || item.employeeId === 'UNASSIGNED' || !item.employeeId)
          ? 'Unassigned / Common Area'
          : (emp.name || item.employeeName || 'Assigned Officer'),
        employeePosition: (item.employeeId === 'emp_unassigned' || item.employeeId === 'UNASSIGNED' || !item.employeeId)
          ? 'Common Area Custodian'
          : (emp.position || ''),
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
        createdBy: creator,
        encodedBy: creator,
        isActive: item.isActive !== false,
        createdAt: item.createdAt,
      };
    });

    // 4. Synthesize initial registration records for all assigned properties that don't have an explicit transfer record
    const recordedPropIds = new Set(formatted.map((a) => a.propertyId));

    const initialAssignments = allProps
      .filter((p) => (p.accountablePersonId || p.officeId) && !recordedPropIds.has(p.id))
      .map((p) => {
        const emp = empMap.get(p.accountablePersonId) || {};
        const off = offMap.get(p.officeId) || {};
        const creator = p.createdBy || p.created_by || extractEncoderFromRemarks(p.remarks) || 'edolotallas';
        const cleanDate = p.assignmentDate
          ? (String(p.assignmentDate).includes('T') ? String(p.assignmentDate).slice(0, 10) : String(p.assignmentDate))
          : (p.acquisitionDate ? String(p.acquisitionDate).slice(0, 10) : new Date(p.createdAt || Date.now()).toISOString().slice(0, 10));

        return {
          id: `init_${p.id}`,
          propertyId: p.id,
          propertyNumber: p.propertyNumber || 'N/A',
          article: p.article || 'Asset',
          description: p.description || '',
          serialNumber: p.serialNumber || '',
          unitValue: p.unitValue || 0,
          unit: p.unit || 'unit',
          poNumber: p.poNumber || '',
          categoryId: p.categoryId || null,

          employeeId: p.accountablePersonId || null,
          employeeName: emp.name || 'Assigned Custodian',
          employeePosition: emp.position || '',
          employeeCode: emp.employeeId || '',
          officeId: p.officeId || null,
          officeName: off.name || 'Assigned Office',
          officeCode: off.code || '',
          previousEmployeeId: null,
          previousEmployeeName: 'None (Initial Registration)',
          previousEmployeePosition: '',
          previousOfficeId: null,
          previousOfficeName: 'None (Initial Registration)',
          assignmentDate: cleanDate,
          remarks: p.remarks || 'Initial property registration and assignment',
          transferredBy: 'System Registration',
          createdBy: creator,
          encodedBy: creator,
          isActive: true,
          createdAt: p.createdAt || new Date().toISOString(),
        };
      });

    let combinedAssignments = [...formatted, ...initialAssignments];

    if (targetUsername) {
      combinedAssignments = combinedAssignments.filter((a) => {
        const prop = propMap.get(a.propertyId) || {};
        const propCreator = (prop.createdBy || prop.created_by || extractEncoderFromRemarks(prop.remarks) || a.createdBy || a.encodedBy || 'edolotallas').toLowerCase().trim();
        const transBy = (a.transferredBy || a.createdBy || '').toLowerCase().trim();

        if (targetUsername === 'queenie_ppsc') {
          return propCreator === 'queenie_ppsc' || propCreator.includes('queenie') || transBy.includes('queenie');
        } else if (targetUsername === 'edolotallas') {
          return (propCreator === 'edolotallas' || (!propCreator.includes('queenie') && propCreator !== 'queenie_ppsc')) && !transBy.includes('queenie');
        }
        return propCreator === targetUsername || transBy.includes(targetUsername);
      });
    }

    return NextResponse.json({ success: true, assignments: combinedAssignments }, { status: 200 });
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
    let empIdForDb = targetEmployeeId;

    if (isUnassigned) {
      empIdForDb = 'emp_unassigned';
      // Upsert sentinel unassigned employee record in DB to satisfy Foreign Key & NOT NULL constraints
      try {
        await supabase.from('employees').upsert(
          [
            {
              id: 'emp_unassigned',
              employeeId: 'EMP-UNASSIGNED',
              name: 'Unassigned / Common Area',
              position: 'Common Area Custodian',
              officeId: targetOfficeId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          { onConflict: 'id' }
        );
      } catch (e) {
        console.warn('Sentinel employee upsert notice:', e.message);
      }
    }

    const sessionUser = await getSessionUser(request);
    const activeUserName = sessionUser?.fullName ? `${sessionUser.fullName} (${sessionUser.role || 'Admin'})` : (sessionUser?.username || 'System Admin');
    const activeUsername = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : 'edolotallas';

    let newRecord = {
      id: newAsgnId,
      propertyId: targetPropertyId,
      employeeId: empIdForDb,
      officeId: targetOfficeId,
      previousEmployeeId: prevEmpId,
      previousOfficeId: prevOffId,
      assignmentDate: parsedDate,
      remarks: remarks ? remarks.trim() : 'Official transfer of property accountability',
      transferredBy: transferredBy ? transferredBy.trim() : activeUserName,
      createdBy: activeUsername,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    let insertedAsgn = null;
    let { data: asgnData, error: insertError } = await supabase
      .from('property_assignments')
      .insert([newRecord])
      .select('*')
      .single();

    if (insertError && (insertError.message?.includes('column "createdBy"') || insertError.message?.includes('column "created_by"'))) {
      const fallbackRecord = { ...newRecord };
      delete fallbackRecord.createdBy;
      const retry = await supabase
        .from('property_assignments')
        .insert([fallbackRecord])
        .select('*')
        .single();
      insertedAsgn = retry.data;
      insertError = retry.error;
    } else {
      insertedAsgn = asgnData;
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
