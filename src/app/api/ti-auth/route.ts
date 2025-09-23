import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

export async function GET() {
  try {
    const token = await getAccessToken();
    return NextResponse.json({ ok: true, tokenPreview: token.slice(0, 12) + '...' });
  } catch (e: any) {
    console.error('TI AUTH ERROR:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'auth error' }, { status: 500 });
  }
}
