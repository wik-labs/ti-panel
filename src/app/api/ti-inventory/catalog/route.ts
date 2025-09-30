import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gpn = searchParams.get('gpn');
    const ccy = searchParams.get('ccy') ?? 'USD';
    if (!gpn) {
      return NextResponse.json({ ok: false, error: 'Missing gpn' }, { status: 400 });
    }

    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'No TI access token' }, { status: 500 });
    }

    const url =
      `https://transact.ti.com/v2/store/products` +
      `?genericPartNumber=${encodeURIComponent(gpn)}` +
      `&currency=${encodeURIComponent(ccy)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, error: json ?? text ?? 'Catalog fetch failed' },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, data: json }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Catalog handler failed' },
      { status: 500 }
    );
  }
}
