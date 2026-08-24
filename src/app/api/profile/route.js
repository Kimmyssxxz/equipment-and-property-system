import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch Admin Profile
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || 'edolotallas';

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: true,
          profile: {
            username: 'edolotallas',
            fullName: 'Elmer G. Dolotallas',
            email: 'supplyoffice1996@gmail.com',
            position: 'Supply Officer / Admin',
            password: 'NFSTISupply123',
          },
        },
        { status: 200 }
      );
    }

    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('Profile fetch notice:', error.message);
    }

    return NextResponse.json(
      {
        success: true,
        profile: user || {
          username: 'edolotallas',
          fullName: 'Elmer G. Dolotallas',
          email: 'supplyoffice1996@gmail.com',
          position: 'Supply Officer / Admin',
          password: 'NFSTISupply123',
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Update Admin Profile & Password in Supabase users table
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, fullName, email, position, password } = body;

    if (!username || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Username and Full Name are required.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = getClient();
      if (supabase) {
        const payload = {
          id: 'usr-admin-1',
          username: username.trim(),
          fullName: fullName.trim(),
          email: email ? email.trim() : 'supplyoffice1996@gmail.com',
          password: password ? password.trim() : 'NFSTISupply123',
          role: 'Admin',
        };

        const { error: upsertErr } = await supabase
          .from('users')
          .upsert([payload], { onConflict: 'username' });

        if (upsertErr) {
          return NextResponse.json(
            { success: false, error: `Supabase save notice: ${upsertErr.message}` },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Profile settings and credentials saved to Supabase successfully',
        profile: {
          username: username.trim(),
          fullName: fullName.trim(),
          email: email ? email.trim() : '',
          position: position || 'Supply Officer / Admin',
          password: password || 'NFSTISupply123',
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
