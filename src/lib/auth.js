import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.SESSION_SECRET || 'nfsti_secure_property_management_secret_key_2026_v1';
const COOKIE_NAME = 'nfsti_session';
const COOKIE_MAX_AGE = 86400; // 24 hours in seconds

/**
 * Base64URL encoding helper (Edge & Node compatible)
 */
function base64UrlEncode(str) {
  const base64 = typeof btoa === 'function'
    ? btoa(str)
    : Buffer.from(str).toString('base64');
  return base64
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decoding helper (Edge & Node compatible)
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return typeof atob === 'function'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * HMAC-SHA256 signature calculation using Web Crypto API
 */
async function getHmacKey(secretStr) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretStr);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Create a signed JWT Token
 */
export async function createSessionToken(userPayload, expiresInSeconds = COOKIE_MAX_AGE) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...userPayload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(JWT_SECRET);
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(dataToSign)
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureString = String.fromCharCode(...signatureArray);
  const encodedSignature = base64UrlEncode(signatureString);

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verify JWT Token and return payload if valid, or null if invalid/expired
 */
export async function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  try {
    const key = await getHmacKey(JWT_SECRET);
    const signatureDecoded = base64UrlDecode(encodedSignature);
    const signatureBytes = new Uint8Array(
      signatureDecoded.split('').map((c) => c.charCodeAt(0))
    );

    const encoder = new TextEncoder();
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(dataToSign)
    );

    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired token
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Secure PBKDF2 Password Hashing using Web Crypto API
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

/**
 * Verify password against stored hash (also supports plaintext comparison for smooth migration)
 */
export async function verifyPassword(password, storedPassword) {
  if (!password || !storedPassword) return false;

  // Handle PBKDF2 hashed password
  if (storedPassword.startsWith('pbkdf2:')) {
    const parts = storedPassword.split(':');
    if (parts.length !== 4) return false;

    const [, iterationsStr, saltHex, originalHashHex] = parts;
    const iterations = parseInt(iterationsStr, 10);
    const saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );

    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      256
    );

    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex === originalHashHex;
  }

  // Fallback for initial legacy plaintext match (for smooth auto-upgrade to hashed)
  return password === storedPassword;
}

/**
 * Attach HttpOnly Session Cookie to NextResponse
 */
export function setSessionCookie(response, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  // Clear old legacy plain cookie if present
  response.cookies.set('nfsti_authenticated', '', { path: '/', maxAge: 0 });
  return response;
}

/**
 * Expire HttpOnly Session Cookie on NextResponse
 */
export function clearSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('nfsti_authenticated', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}

export { COOKIE_NAME };
