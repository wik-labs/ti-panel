import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const U = process.env.APP_USERNAME ?? '';
  const P = process.env.APP_PASSWORD ?? '';
  const S = process.env.APP_SESSION_SECRET ?? '';
  const TTL = parseInt(process.env.APP_SESSION_TTL_HOURS ?? '8', 10);
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  const okUser = timingSafeEq(username ?? '', U);
  const okPass = timingSafeEq(password ?? '', P);
  if (!okUser || !okPass) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createSession(username, TTL, S);
  const res = NextResponse.json({ ok: true });

  res.cookies.set('session', token, {
    httpOnly: true,
    secure: isProd,       // ⬅️ tylko prod/https
    sameSite: 'lax',
    path: '/',
    maxAge: TTL * 3600,
  });

  return res;
}

function timingSafeEq(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
