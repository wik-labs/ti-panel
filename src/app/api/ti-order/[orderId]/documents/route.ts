import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  const urlObj = new URL(req.url);
  const wantMock = urlObj.searchParams.get('mock') === '1';
  const useMocks = wantMock || process.env.USE_TTI_MOCKS === 'true';

  if (useMocks) {
    try {
      const fp = path.join(process.cwd(), 'src', 'mocks', 'docs', `${params.orderId}.json`);
      const buf = await fs.readFile(fp, 'utf8');
      const json = JSON.parse(buf);
      return NextResponse.json({ ok: true, data: json, meta: { mock: true } });
    } catch {
      return NextResponse.json({ ok: true, data: { documents: [] }, meta: { mock: true } });
    }
  }

  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ ok: false, error: 'No TI access token' }, { status: 500 });

    const base = (process.env.TI_FIN_BASE || '').replace(/\/+$/, '');
    if (!base) return NextResponse.json({ ok: false, error: 'Missing TI_FIN_BASE' }, { status: 500 });

    const isTest = (process.env.TI_ORDER_MODE || process.env.NEXT_PUBLIC_TI_ORDER_MODE) === 'test';
    const type = urlObj.searchParams.get('type') || '';
    const url = `${base}/${encodeURIComponent(params.orderId)}/financial-documents${isTest ? '/test' : ''}${type ? `?type=${encodeURIComponent(type)}` : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store'
    });

    if (res.status >= 500) {
      const fp = path.join(process.cwd(), 'src', 'mocks', 'docs', `${params.orderId}.json`);
      try {
        const json = JSON.parse(await fs.readFile(fp, 'utf8'));
        return NextResponse.json({ ok: true, data: json, meta: { mock: true, url } });
      } catch {}
    }

    const text = await res.text();
    let json: any = null; try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status, error: json ?? text ?? 'Docs list failed', url }, { status: res.status });

    return NextResponse.json({ ok: true, data: json, meta: { url } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Docs handler failed' }, { status: 500 });
  }
}
