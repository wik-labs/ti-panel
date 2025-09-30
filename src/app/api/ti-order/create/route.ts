import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

const BASE = process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com';
const ORDER_MODE = process.env.TI_ORDER_MODE ?? process.env.NEXT_PUBLIC_TI_ORDER_MODE ?? 'test';

// helper wybierający właściwy URL (test vs live)
function buildCreateUrl() {
  return ORDER_MODE === 'live'
    ? `${BASE}/v2/store/orders/`     // ⚠️ produkcja
    : `${BASE}/v2/store/orders/test`; // ✅ test – bezpieczne
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseMs = 400): Promise<T> {
  let err: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e: any) {
      const s = e?.response?.status ?? e?.status;
      if (s && s !== 429 && s < 500) throw e;
      await new Promise(r => setTimeout(r, baseMs * (2 ** i)));
      err = e;
    }
  }
  throw err;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json(); // { order: {...} }
    const token = await getAccessToken();

    const url = buildCreateUrl();

    const res = await withRetry(() => fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }));

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data, meta: { endpoint: url } }, { status: res.status });
    }

    return NextResponse.json({ ok: true, result: data, meta: { endpoint: url } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
