import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all employees / personnel from the Database
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Database is not configured yet. Check .env.local.',
          configured: false,
          employees: [],
        },
        { status: 500 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize database client.', employees: [] },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*, offices(id, code, name)')
      .order('name', { ascending: true });

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist')
      ) {
        return NextResponse.json(
          {
            tableMissing: true,
            error:
              'The "employees" table does not exist in the database yet. Please run the SQL schema in your SQL Editor.',
            employees: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: error.message, employees: [] }, { status: 400 });
    }

    return NextResponse.json({ success: true, employees: data || [] }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, employees: [] }, { status: 500 });
  }
}

// POST: Create a new employee in the Database
export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeId, name, position, officeId, email, phone, status, assumedDate } = body;

    if (!employeeId || !name || !position || !officeId) {
      return NextResponse.json(
        { error: 'Employee ID, Full Name, Position, and Office/Department are required.' },
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

    const trimmedEmpId = employeeId.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedPos = position.trim();
    const trimmedOfficeId = officeId.trim();
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const empStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const parsedAssumedDate = assumedDate ? new Date(assumedDate).toISOString() : new Date().toISOString();

    // Check if employeeId or name already exists
    const { data: existing, error: checkError } = await supabase
      .from('employees')
      .select('id, employeeId, name')
      .or(`employeeId.eq.${trimmedEmpId},name.eq.${trimmedName}`);

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code === '42P01' || checkError.code === 'PGRST205') {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'Table "employees" not found in the database. Please run the SQL schema first.',
          },
          { status: 400 }
        );
      }
    }

    if (existing && existing.length > 0) {
      const idMatch = existing.find((e) => e.employeeId === trimmedEmpId);
      if (idMatch) {
        return NextResponse.json(
          { error: `Employee ID "${trimmedEmpId}" is already registered. Please use a unique Employee ID.` },
          { status: 400 }
        );
      }
      const nameMatch = existing.find((e) => e.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameMatch) {
        return NextResponse.json(
          { error: `Personnel record for "${trimmedName}" already exists.` },
          { status: 400 }
        );
      }
    }

    // Generate unique ID
    const newId = 'emp_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const newEmployee = {
      id: newId,
      employeeId: trimmedEmpId,
      name: trimmedName,
      position: trimmedPos,
      officeId: trimmedOfficeId,
      email: trimmedEmail,
      phone: trimmedPhone,
      status: empStatus,
      assumedDate: parsedAssumedDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error: insertError } = await supabase
      .from('employees')
      .insert([newEmployee])
      .select('*, offices(id, code, name)')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, employee: data || newEmployee },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing employee in the Database
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, employeeId, name, position, officeId, email, phone, status, assumedDate } = body;

    if (!id || !employeeId || !name || !position || !officeId) {
      return NextResponse.json(
        { error: 'Employee ID, Name, Position, and Office are required for updating.' },
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

    const trimmedEmpId = employeeId.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedPos = position.trim();
    const trimmedOfficeId = officeId.trim();
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const empStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const parsedAssumedDate = assumedDate ? new Date(assumedDate).toISOString() : undefined;

    // Check conflict with other employees (excluding current id)
    const { data: existing } = await supabase
      .from('employees')
      .select('id, employeeId, name')
      .neq('id', id)
      .or(`employeeId.eq.${trimmedEmpId},name.eq.${trimmedName}`);

    if (existing && existing.length > 0) {
      const idMatch = existing.find((e) => e.employeeId === trimmedEmpId);
      if (idMatch) {
        return NextResponse.json(
          { error: `Employee ID "${trimmedEmpId}" is already used by another personnel.` },
          { status: 400 }
        );
      }
      const nameMatch = existing.find((e) => e.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameMatch) {
        return NextResponse.json(
          { error: `Personnel Name "${trimmedName}" is already used by another record.` },
          { status: 400 }
        );
      }
    }

    const updatePayload = {
      employeeId: trimmedEmpId,
      name: trimmedName,
      position: trimmedPos,
      officeId: trimmedOfficeId,
      email: trimmedEmail,
      phone: trimmedPhone,
      status: empStatus,
      updatedAt: new Date().toISOString(),
    };

    if (parsedAssumedDate) {
      updatePayload.assumedDate = parsedAssumedDate;
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updatePayload)
      .eq('id', id)
      .select('*, offices(id, code, name)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, employee: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete an employee from the Database
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not initialized.' },
        { status: 500 }
      );
    }

    // Check if any properties reference this employee as accountable custodian
    const { count: propCount, error: propErr } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('accountablePersonId', id);

    if (!propErr && propCount && propCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete employee because ${propCount} property item(s) are currently under their accountable custody. Please reassign those properties first.`,
        },
        { status: 400 }
      );
    }

    // Check if any property assignments are assigned to this employee
    const { count: asgnCount, error: asgnErr } = await supabase
      .from('property_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('employeeId', id);

    if (!asgnErr && asgnCount && asgnCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete employee because active property assignments exist under their name. Please reassign those items first.`,
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: 'Employee record removed successfully.' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
