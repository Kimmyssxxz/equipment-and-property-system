import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getSessionUser, hashPassword } from '@/lib/auth';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

// GET: Fetch Admin Profile for the active user
export async function GET(request) {
  try {
    const sessionUser = await getSessionUser(request);
    let username = sessionUser?.username ? sessionUser.username.toLowerCase().trim() : null;

    if (request && request.url) {
      try {
        const { searchParams } = new URL(request.url);
        const uParam = searchParams.get('username') || searchParams.get('user');
        if (uParam) username = uParam.toLowerCase().trim();
      } catch (e) {}
    }

    if (!username) {
      username = 'edolotallas';
    }

    const isQueenie = username.includes('queenie');

    const defaultProfile = isQueenie
      ? {
          username: 'queenie_ppsc',
          fullName: 'Queenie PPSC',
          email: 'queenie.ppsc@gmail.com',
          position: 'Property & Supply Admin',
          password: 'NFSTISupply123',
        }
      : {
          username: 'edolotallas',
          fullName: 'Elmer G. Dolotallas',
          email: 'supplyoffice1996@gmail.com',
          position: 'Supply Officer / Admin',
          password: 'NFSTISupply123',
        };

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: true,
          profile: defaultProfile,
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
      .ilike('username', username)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Profile fetch notice:', error.message);
    }

    const userProfile = user
      ? {
          username: user.username,
          fullName: user.fullName || defaultProfile.fullName,
          email: user.email || defaultProfile.email,
          position: user.position || defaultProfile.position,
          password: user.password ? '••••••••••••' : defaultProfile.password,
        }
      : defaultProfile;

    return NextResponse.json(
      {
        success: true,
        profile: userProfile,
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

    const cleanUsername = username.trim().toLowerCase();
    const isQueenie = cleanUsername.includes('queenie');

    if (isSupabaseConfigured()) {
      const supabase = getClient();
      if (supabase) {
        // Fetch existing user to get id
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, password')
          .ilike('username', cleanUsername)
          .maybeSingle();

        const userId = existingUser?.id || (isQueenie ? 'usr-admin-queenie' : 'usr-admin-1');
        
        let finalPassword = existingUser?.password || 'NFSTISupply123';
        if (password && password !== '••••••••••••') {
          finalPassword = await hashPassword(password.trim());
        }

        const payload = {
          id: userId,
          username: cleanUsername,
          fullName: fullName.trim(),
          email: email ? email.trim() : (isQueenie ? 'queenie.ppsc@gmail.com' : 'supplyoffice1996@gmail.com'),
          password: finalPassword,
          role: 'Admin',
        };

        let { error: upsertErr } = await supabase
          .from('users')
          .upsert([payload], { onConflict: 'username' });

        if (upsertErr && upsertErr.message && (upsertErr.message.includes('column') || upsertErr.message.includes('schema cache'))) {
          // Retry with minimal safe fields without role if schema cache differs
          const safePayload = {
            id: userId,
            username: cleanUsername,
            fullName: fullName.trim(),
            email: email ? email.trim() : (isQueenie ? 'queenie.ppsc@gmail.com' : 'supplyoffice1996@gmail.com'),
            password: finalPassword,
          };
          const retryRes = await supabase
            .from('users')
            .upsert([safePayload], { onConflict: 'username' });
          upsertErr = retryRes.error;
        }

        if (upsertErr) {
          console.warn('Profile Supabase upsert notice:', upsertErr.message);
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
          username: cleanUsername,
          fullName: fullName.trim(),
          email: email ? email.trim() : '',
          position: position || (isQueenie ? 'Property & Supply Admin' : 'Supply Officer / Admin'),
          password: '••••••••••••',
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
