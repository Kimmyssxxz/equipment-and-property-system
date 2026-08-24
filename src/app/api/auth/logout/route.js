import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully.' },
      { status: 200 }
    );
    return clearSessionCookie(response);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Error logging out.' },
      { status: 500 }
    );
  }
}
