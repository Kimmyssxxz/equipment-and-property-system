import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch all categories from Database
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Database is not configured yet. Check .env.local.',
          configured: false,
          categories: [],
        },
        { status: 500 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize database client.', categories: [] },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('property_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // 42P01 or PGRST205 means table doesn't exist yet
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'The "property_categories" table does not exist in the database yet. Please run the SQL schema in your SQL Editor.',
            categories: [],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: error.message, categories: [] }, { status: 400 });
    }

    return NextResponse.json({ success: true, categories: data || [] }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message, categories: [] }, { status: 500 });
  }
}

// POST: Create a new category
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Category Code and Category Name are required.' },
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
    const trimmedDesc = description ? description.trim() : null;

    // Check if code or name already exists
    const { data: existing, error: checkError } = await supabase
      .from('property_categories')
      .select('id, code, name')
      .or(`code.eq.${trimmedCode},name.eq.${trimmedName}`);

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code === '42P01' || checkError.code === 'PGRST205') {
        return NextResponse.json(
          {
            tableMissing: true,
            error: 'Table "property_categories" not found in the database. Please run the SQL script first.',
          },
          { status: 400 }
        );
      }
    }

    if (existing && existing.length > 0) {
      const codeMatch = existing.find((c) => c.code === trimmedCode);
      if (codeMatch) {
        return NextResponse.json(
          { error: `Category Code "${trimmedCode}" is already in use. Please use a unique code.` },
          { status: 400 }
        );
      }
      const nameMatch = existing.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameMatch) {
        return NextResponse.json(
          { error: `Category Name "${trimmedName}" already exists.` },
          { status: 400 }
        );
      }
    }

    // Insert new category
    const newId = 'cat_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const newCategory = {
      id: newId,
      code: trimmedCode,
      name: trimmedName,
      description: trimmedDesc,
    };

    const { data, error: insertError } = await supabase
      .from('property_categories')
      .insert([newCategory])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, category: data || newCategory },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing category in Supabase
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, code, name, description } = body;

    if (!id || !code || !name) {
      return NextResponse.json(
        { error: 'Category ID, Code, and Name are required for updating.' },
        { status: 400 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not initialized.' },
        { status: 500 }
      );
    }

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedDesc = description ? description.trim() : null;

    // Check conflict with other categories (excluding this id)
    const { data: existing } = await supabase
      .from('property_categories')
      .select('id, code, name')
      .neq('id', id)
      .or(`code.eq.${trimmedCode},name.eq.${trimmedName}`);

    if (existing && existing.length > 0) {
      const codeMatch = existing.find((c) => c.code === trimmedCode);
      if (codeMatch) {
        return NextResponse.json(
          { error: `Category Code "${trimmedCode}" is already used by another category.` },
          { status: 400 }
        );
      }
      const nameMatch = existing.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameMatch) {
        return NextResponse.json(
          { error: `Category Name "${trimmedName}" is already used by another category.` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('property_categories')
      .update({
        code: trimmedCode,
        name: trimmedName,
        description: trimmedDesc,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, category: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a category from Supabase
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not initialized.' },
        { status: 500 }
      );
    }

    // Check if any properties reference this category
    const { count, error: countError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('categoryId', id);

    if (!countError && count && count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category because ${count} property item(s) are currently attached to it. Please reassign those items first.`,
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('property_categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: 'Category deleted successfully.' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
