import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

const BASE = process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pn = searchParams.get('pn');
    const ccy = searchParams.get('ccy') || 'USD';
    if (!pn) return NextResponse.json({ ok:false, error:'Missing pn' }, { status:400 });

    const token = await getAccessToken();
    const url = `${BASE}/v2/store/products/${encodeURIComponent(pn)}?currency=${ccy}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ ok:false, error:data }, { status: res.status });

    return NextResponse.json({ ok:true, data, meta:{ url } });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? 'Unknown' }, { status:500 });
  }
}
