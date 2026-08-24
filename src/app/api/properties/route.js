import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all properties / inventory items from Database
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Database is not configured yet. Check .env.local.',
          configured: false,
          properties: [],
        },
        { status: 500 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize database client.', properties: [] },
        { status: 500 }
      );
    }

    let { data, error } = await supabase
      .from('properties')
      .select('*, property_categories(id, code, name)')
      .order('createdAt', { ascending: false });

    if (error) {
      // Fallback query without relational join if foreign key constraint is missing
      const fallback = await supabase
        .from('properties')
        .select('*')
        .order('createdAt', { ascending: false });
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

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
              'The "properties" table does not exist in the database yet. Please run the SQL schema in your SQL Editor.',
            properties: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: error.message, properties: [] }, { status: 400 });
    }

    return NextResponse.json({ success: true, properties: data || [] }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, properties: [] }, { status: 500 });
  }
}

// POST: Create a new property / asset item in Database
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      propertyNumber,
      article,
      description,
      categoryId,
      unit,
      unitValue,
      quantityPerCard,
      acquisitionDate,
      poNumber,
      poDate,
      serialNumber,
      serial_number,
      remarks,
      status,
    } = body;

    if (!propertyNumber || !article || !categoryId) {
      return NextResponse.json(
        { error: 'Property Number, Article / Item Name, and Property Category are required.' },
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

    const trimmedPropNo = propertyNumber.trim();
    const trimmedArticle = article.trim();
    const trimmedDesc = description ? description.trim() : trimmedArticle;
    const numUnitValue = parseFloat(unitValue) || 0.0;
    const numQty = parseInt(quantityPerCard, 10) || 1;
    const propStatus = status || 'ACTIVE';
    const cleanSerialNumber = serialNumber ? serialNumber.trim() : (serial_number ? serial_number.trim() : null);

    // Check if propertyNumber already exists
    const { data: existing, error: checkError } = await supabase
      .from('properties')
      .select('id, propertyNumber')
      .eq('propertyNumber', trimmedPropNo);

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code === '42P01' || checkError.code === 'PGRST205') {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'Table "properties" not found in database. Please run the SQL schema first.',
          },
          { status: 400 }
        );
      }
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: `Property Number "${trimmedPropNo}" is already in use. Please enter a unique property number.`,
        },
        { status: 400 }
      );
    }

    const newId = 'prop_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const newProperty = {
      id: newId,
      propertyNumber: trimmedPropNo,
      article: trimmedArticle,
      description: trimmedDesc,
      categoryId: categoryId.trim(),
      unit: unit ? unit.trim() : 'unit',
      unitValue: numUnitValue,
      quantityPerCard: numQty,
      acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : new Date().toISOString(),
      poNumber: poNumber ? poNumber.trim() : null,
      poDate: poDate ? new Date(poDate).toISOString() : null,
      serialNumber: cleanSerialNumber,
      remarks: remarks ? remarks.trim() : null,
      status: propStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error: insertError } = await supabase
      .from('properties')
      .insert([newProperty])
      .select('*, property_categories(id, code, name)')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, property: data || newProperty }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing property in Database
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      propertyNumber,
      article,
      description,
      categoryId,
      unit,
      unitValue,
      quantityPerCard,
      acquisitionDate,
      poNumber,
      poDate,
      serialNumber,
      serial_number,
      remarks,
      status,
    } = body;

    if (!id || !propertyNumber || !article || !categoryId) {
      return NextResponse.json(
        { error: 'Property ID, Property Number, Article, and Category are required for updating.' },
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

    const trimmedPropNo = propertyNumber.trim();
    const trimmedArticle = article.trim();
    const trimmedDesc = description ? description.trim() : trimmedArticle;
    const numUnitValue = parseFloat(unitValue) || 0.0;
    const numQty = parseInt(quantityPerCard, 10) || 1;
    const propStatus = status || 'ACTIVE';
    const cleanSerialNumber = serialNumber ? serialNumber.trim() : (serial_number ? serial_number.trim() : null);

    // Check collision for propertyNumber excluding current id
    const { data: existing } = await supabase
      .from('properties')
      .select('id, propertyNumber')
      .neq('id', id)
      .eq('propertyNumber', trimmedPropNo);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: `Property Number "${trimmedPropNo}" is already in use by another record.`,
        },
        { status: 400 }
      );
    }

    const updatePayload = {
      propertyNumber: trimmedPropNo,
      article: trimmedArticle,
      description: trimmedDesc,
      categoryId: categoryId.trim(),
      unit: unit ? unit.trim() : 'unit',
      unitValue: numUnitValue,
      quantityPerCard: numQty,
      poNumber: poNumber ? poNumber.trim() : null,
      serialNumber: cleanSerialNumber,
      remarks: remarks ? remarks.trim() : null,
      status: propStatus,
      updatedAt: new Date().toISOString(),
    };


    if (acquisitionDate) {
      updatePayload.acquisitionDate = new Date(acquisitionDate).toISOString();
    }
    if (poDate) {
      updatePayload.poDate = new Date(poDate).toISOString();
    }

    const { data, error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', id)
      .select('*, property_categories(id, code, name)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, property: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a property record from Database
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Property ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database client not initialized.' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: 'Property deleted successfully.' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Partial update for property fields (e.g. officeId, location)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...fieldsToUpdate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Property ID is required for patch.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not initialized.' }, { status: 500 });
    }

    fieldsToUpdate.updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('properties')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, property: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
