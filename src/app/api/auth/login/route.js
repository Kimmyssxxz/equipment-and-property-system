import { NextResponse } from 'next/server';
import { getServiceSupabase, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { createSessionToken, hashPassword, verifyPassword, setSessionCookie } from '@/lib/auth';

function getClient() {
  const service = getServiceSupabase();
  if (service) return service;
  return getSupabaseClient();
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required.' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const lowerUsername = trimmedUsername.toLowerCase();
    const isEdolotallasInitial =
      lowerUsername === 'edolotallas' &&
      password === 'NFSTISupply123';
    const isQueenieInitial =
      lowerUsername === 'queenie_ppsc' &&
      (password === 'NFSTISupply123' || password === 'QueeniePPSC2026!' || password === 'PPSCAdmin2026' || password === 'password123');

    const isInitialAdminInput = isEdolotallasInitial || isQueenieInitial;

    let dbUser = null;
    const supabase = isSupabaseConfigured() ? getClient() : null;

    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', trimmedUsername)
        .maybeSingle();

      if (!error && data) {
        dbUser = data;
      }

      // Auto-seed admin user in Supabase with PBKDF2 hashed password if missing
      if (!dbUser && isInitialAdminInput) {
        try {
          const hashedPassword = await hashPassword(password);
          const isQueenie = lowerUsername === 'queenie_ppsc';
          const seedUser = {
            id: isQueenie ? 'usr-admin-queenie' : 'usr-admin-1',
            username: isQueenie ? 'queenie_ppsc' : 'edolotallas',
            email: isQueenie ? 'queenie.ppsc@gmail.com' : 'supplyoffice1996@gmail.com',
            fullName: isQueenie ? 'Queenie PPSC' : 'Elmer G. Dolotallas',
            password: hashedPassword,
            role: 'Admin',
          };

          const { data: newUser } = await supabase
            .from('users')
            .upsert([seedUser], { onConflict: 'username' })
            .select()
            .single();

          if (newUser) dbUser = newUser;
        } catch (e) {
          console.warn('Auto-seed admin user notice:', e);
        }
      }
    }

    let isValidPassword = false;

    if (dbUser && dbUser.password) {
      isValidPassword = await verifyPassword(password, dbUser.password);

      // Auto-migrate plaintext password to PBKDF2 hash upon successful login
      if (isValidPassword && !dbUser.password.startsWith('pbkdf2:') && supabase) {
        try {
          const newHash = await hashPassword(password);
          await supabase
            .from('users')
            .update({ password: newHash, updatedAt: new Date().toISOString() })
            .eq('id', dbUser.id);
        } catch (migErr) {
          console.warn('Password hash migration warning:', migErr);
        }
      }
    } else if (isInitialAdminInput) {
      isValidPassword = true;
    }

    if (isValidPassword) {
      const isQueenie = lowerUsername.includes('queenie');
      const userPayload = {
        id: dbUser?.id || (isQueenie ? 'usr-admin-queenie' : 'usr-admin-1'),
        username: dbUser?.username || trimmedUsername,
        fullName: dbUser?.fullName || (isQueenie ? 'Queenie PPSC' : 'Elmer G. Dolotallas'),
        name: dbUser?.fullName || (isQueenie ? 'Queenie PPSC' : 'Elmer G. Dolotallas'),
        role: dbUser?.role || 'Admin',
        position: isQueenie ? 'Property & Supply Admin' : 'Supply Officer / Admin',
        initials: isQueenie ? 'QP' : 'ED',
      };

      // Create signed JWT session token
      const sessionToken = await createSessionToken(userPayload);

      const response = NextResponse.json(
        {
          success: true,
          message: 'Successfully logged in!',
          user: userPayload,
        },
        { status: 200 }
      );

      // Set HttpOnly session cookie
      return setSessionCookie(response, sessionToken);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid Username or Password. Please try again.',
      },
      { status: 401 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'An error occurred during login.' },
      { status: 500 }
    );
  }
}
