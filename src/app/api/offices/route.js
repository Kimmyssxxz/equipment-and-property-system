import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all offices from the Database
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Database is not configured yet. Check .env.local.',
          configured: false,
          offices: [],
        },
        { status: 500 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize database client.', offices: [] },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('offices')
      .select('*')
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
              'The "offices" table does not exist in the database yet. Please run the SQL schema in your SQL Editor.',
            offices: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: error.message, offices: [] }, { status: 400 });
    }

    return NextResponse.json({ success: true, offices: data || [] }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, offices: [] }, { status: 500 });
  }
}

// POST: Create a new office in the Database
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, head, email, phone, floor, notes, status } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Deploying Area Code and Deploying Area Name are required.' },
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

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedHead = head ? head.trim() : '';
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedFloor = floor ? floor.trim() : null;
    const trimmedNotes = notes ? notes.trim() : null;
    const officeStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Check if code or name already exists
    const { data: existing, error: checkError } = await supabase
      .from('offices')
      .select('id, code, name')
      .or(`code.eq.${trimmedCode},name.eq.${trimmedName}`);

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code === '42P01' || checkError.code === 'PGRST205') {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'Table "offices" not found in the database. Please run the SQL schema first.',
          },
          { status: 400 }
        );
      }
    }

    if (existing && existing.length > 0) {
      const codeMatch = existing.find((c) => c.code === trimmedCode);
      if (codeMatch) {
        return NextResponse.json(
          { error: `Office Code "${trimmedCode}" is already in use. Please use a unique code.` },
          { status: 400 }
        );
      }
      const nameMatch = existing.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameMatch) {
        return NextResponse.json(
          { error: `Office Name "${trimmedName}" already exists.` },
          { status: 400 }
        );
      }
    }

    // Generate unique ID
    const newId = 'off_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const newOffice = {
      id: newId,
      code: trimmedCode,
      name: trimmedName,
      head: trimmedHead,
      email: trimmedEmail,
      phone: trimmedPhone,
      floor: trimmedFloor,
      notes: trimmedNotes,
      status: officeStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error: insertError } = await supabase
      .from('offices')
      .insert([newOffice])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, office: data || newOffice },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing office in the Database
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, code, name, head, email, phone, floor, notes, status } = body;

    if (!id || !code || !name) {
      return NextResponse.json(
        { error: 'Deploying Area ID, Code, and Name are required for updating.' },
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

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedHead = head ? head.trim() : '';
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedFloor = floor ? floor.trim() : null;
    const trimmedNotes = notes ? notes.trim() : null;
    const officeStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Check collision with other offices (excluding this id)
    const { data: existing } = await supabase
      .from('offices')
      .select('id, code, name')
      .neq('id', id)
      .or(`code.eq.${trimmedCode},name.eq.${trimmedName}`);

    if (existing && existing.length > 0) {
      const codeMatch = existing.find((c) => c.code === trimmedCode);
      if (codeMatch) {
        return NextResponse.json(
          { error: `Office Code "${trimmedCode}" is already used by another department.` },
          { status: 400 }
        );
      }
      const nameMatch = existing.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameMatch) {
        return NextResponse.json(
          { error: `Office Name "${trimmedName}" is already used by another department.` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('offices')
      .update({
        code: trimmedCode,
        name: trimmedName,
        head: trimmedHead,
        email: trimmedEmail,
        phone: trimmedPhone,
        floor: trimmedFloor,
        notes: trimmedNotes,
        status: officeStatus,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, office: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete an office from the Database
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Office ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not initialized.' },
        { status: 500 }
      );
    }

    // Check if any employees reference this office
    const { count: empCount, error: empCountErr } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('officeId', id);

    if (!empCountErr && empCount && empCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete office because ${empCount} personnel/employee(s) are currently assigned to this office. Please reassign those employees first.`,
        },
        { status: 400 }
      );
    }

    // Check if any properties reference this office
    const { count: propCount, error: propCountErr } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('officeId', id);

    if (!propCountErr && propCount && propCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete office because ${propCount} property item(s) are assigned to this location. Please reassign those properties first.`,
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('offices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: 'Office removed successfully.' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
