import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  getSessionUser,
  attachEncoderToRemarks,
  extractEncoderFromRemarks,
  cleanRemarksForDisplay,
} from '@/lib/auth';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all offices from the Database (User-Scoped)
export async function GET(request) {
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

    const sessionUser = await getSessionUser(request);
    let targetUsername = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : null;
    let allowAll = false;

    if (request && request.url) {
      try {
        const { searchParams } = new URL(request.url);
        const uParam = searchParams.get('username') || searchParams.get('user');
        if (uParam) targetUsername = uParam.toLowerCase().trim();
        if (searchParams.get('all') === 'true') allowAll = true;
      } catch (e) {}
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

    let rawList = data || [];

    const formattedList = rawList.map((off) => {
      const creator = off.createdBy || off.created_by || extractEncoderFromRemarks(off.notes) || 'edolotallas';
      return {
        ...off,
        notes: cleanRemarksForDisplay(off.notes),
        createdBy: creator,
        encodedBy: creator,
      };
    });

    let filteredList = formattedList;
    if (targetUsername) {
      filteredList = formattedList.filter((off) => {
        const creator = (off.createdBy || off.encodedBy || 'edolotallas').toLowerCase().trim();
        if (targetUsername === 'queenie_ppsc') {
          return creator === 'queenie_ppsc' || creator.includes('queenie');
        } else if (targetUsername === 'edolotallas') {
          return creator === 'edolotallas' || (!creator.includes('queenie') && creator !== 'queenie_ppsc');
        }
        return creator === targetUsername;
      });
    }

    return NextResponse.json({ success: true, offices: filteredList }, { status: 200 });
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

    const sessionUser = await getSessionUser(request);
    const activeUsername = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : 'edolotallas';

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedHead = head ? head.trim() : '';
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedFloor = floor ? floor.trim() : null;
    const trimmedNotes = notes ? notes.trim() : '';
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
      createdBy: activeUsername,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let insertedData = null;
    let { data, error: insertError } = await supabase
      .from('offices')
      .insert([newOffice])
      .select()
      .single();

    if (insertError) {
      if (insertError.message?.includes('column "createdBy"') || insertError.message?.includes('column "created_by"')) {
        const fallbackOffice = { ...newOffice };
        delete fallbackOffice.createdBy;
        const retry = await supabase
          .from('offices')
          .insert([fallbackOffice])
          .select()
          .single();
        if (retry.error) {
          return NextResponse.json({ error: retry.error.message }, { status: 400 });
        }
        insertedData = retry.data;
      } else {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    } else {
      insertedData = data;
    }

    const returnedOff = {
      ...(insertedData || newOffice),
      notes: cleanRemarksForDisplay(trimmedNotes),
      createdBy: activeUsername,
      encodedBy: activeUsername,
    };

    return NextResponse.json(
      { success: true, office: returnedOff },
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

    const sessionUser = await getSessionUser(request);
    const activeUsername = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : 'edolotallas';

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedHead = head ? head.trim() : '';
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedFloor = floor ? floor.trim() : null;
    const trimmedNotes = notes ? notes.trim() : '';
    const officeStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Fetch existing office to preserve creator
    const { data: currentOff } = await supabase
      .from('offices')
      .select('notes, createdBy, created_by')
      .eq('id', id)
      .maybeSingle();

    const originalCreator = currentOff?.createdBy || currentOff?.created_by || (currentOff ? extractEncoderFromRemarks(currentOff.notes) : activeUsername);

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

    const returned = {
      ...data,
      notes: cleanRemarksForDisplay(data.notes),
      createdBy: originalCreator,
      encodedBy: originalCreator,
    };

    return NextResponse.json({ success: true, office: returned }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete an office from the Database (auto-unassigns linked items/staff)
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

    // 1. Unassign properties assigned to this office location
    try {
      await supabase
        .from('properties')
        .update({ officeId: null })
        .eq('officeId', id);
    } catch (e) {}

    // 2. Unassign property assignments for this office
    try {
      await supabase
        .from('property_assignments')
        .update({ officeId: null })
        .eq('officeId', id);
    } catch (e) {}

    // 3. Unassign employees belonging to this office
    try {
      await supabase
        .from('employees')
        .update({ officeId: null })
        .eq('officeId', id);
    } catch (e) {}

    // 4. Delete office record cleanly
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
