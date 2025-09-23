import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

const BASE = process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com';

export async function GET() {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${BASE}/v2/checkoutprofiles`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ ok:false, error:data }, { status: res.status });
    return NextResponse.json({ ok:true, data });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
