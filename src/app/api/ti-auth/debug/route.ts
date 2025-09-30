// src/app/api/ti-auth/debug/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

export const runtime = 'nodejs';

function decode(token: string) {
  const parts = token.split('.');
  const payload = parts[1] ? JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) : null;
  return payload; // {iss,aud,scope,client_id,exp,...}
}

export async function GET() {
  const token = await getAccessToken();
  return NextResponse.json({ ok: true, payload: decode(token) });
}
