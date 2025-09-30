import { NextResponse } from 'next/server';

export async function POST() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', '', {
    httpOnly: true,
    secure: isProd,    // ⬅️ te same atrybuty co przy set
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
