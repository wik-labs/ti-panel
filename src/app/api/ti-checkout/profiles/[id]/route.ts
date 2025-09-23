// src/app/api/ti-checkout/profiles/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

const BASE = process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx?.params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    }

    const token = await getAccessToken();
    const url = `${BASE}/v2/checkoutprofiles/${encodeURIComponent(id)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Fallback: jeśli API nie wspiera GET-by-id u Twojego konta, przefiltruj lokalnie listę
      if (res.status === 404) {
        const list = await fetch(`${BASE}/v2/checkoutprofiles`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        }).then(r => r.json()).catch(() => []);
        const found = Array.isArray(list) ? list.find((p: any) => p.checkoutProfileId === id) : null;
        if (found) return NextResponse.json({ ok: true, data: found });
      }
      return NextResponse.json({ ok: false, error: data }, { status: res.status });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
