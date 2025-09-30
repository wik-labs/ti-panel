import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  const urlObj = new URL(req.url);
  const wantMock = urlObj.searchParams.get('mock') === '1';
  const useMocks = wantMock || process.env.USE_TTI_MOCKS === 'true';

  // DEMO / MOCK
  if (useMocks) {
    try {
      const fp = path.join(process.cwd(), 'src', 'mocks', 'asn', `${params.orderId}.json`);
      const buf = await fs.readFile(fp, 'utf8');
      const json = JSON.parse(buf);
      return NextResponse.json({ ok: true, data: json, meta: { mock: true } });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: `Mock ASN not found for ${params.orderId}` }, { status: 404 });
    }
  }

  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ ok: false, error: 'No TI access token' }, { status: 500 });

    const base = (process.env.TI_ASN_BASE || '').replace(/\/+$/, '');
    if (!base) return NextResponse.json({ ok: false, error: 'Missing TI_ASN_BASE' }, { status: 500 });

    const isTest = (process.env.TI_ORDER_MODE || process.env.NEXT_PUBLIC_TI_ORDER_MODE) === 'test';
    const url = `${base}/${encodeURIComponent(params.orderId)}/advanced-shipment-notices${isTest ? '/test' : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store'
    });

    // Fallback do mocka przy 5xx
    if (res.status >= 500) {
      const fp = path.join(process.cwd(), 'src', 'mocks', 'asn', `${params.orderId}.json`);
      try {
        const json = JSON.parse(await fs.readFile(fp, 'utf8'));
        return NextResponse.json({ ok: true, data: json, meta: { mock: true, url } });
      } catch {}
    }

    const text = await res.text();
    let json: any = null; try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status, error: json ?? text ?? 'ASN failed', url }, { status: res.status });

    return NextResponse.json({ ok: true, data: json, meta: { url } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'ASN handler failed' }, { status: 500 });
  }
}
