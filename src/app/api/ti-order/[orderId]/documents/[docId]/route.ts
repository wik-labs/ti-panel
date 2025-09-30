import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET(req: Request, { params }: { params: { orderId: string; docId: string } }) {
  const urlObj = new URL(req.url);
  const wantMock = urlObj.searchParams.get('mock') === '1';
  const useMocks = wantMock || process.env.USE_TTI_MOCKS === 'true';

  if (useMocks) {
    try {
      const fp = path.join(process.cwd(), 'public', 'mock-invoice.pdf');
      const buf = await fs.readFile(fp);
      return new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="mock-invoice.pdf"`,
          'Cache-Control': 'no-store'
        }
      });
    } catch {
      return NextResponse.json({ ok: false, error: 'mock-invoice.pdf not found in /public' }, { status: 404 });
    }
  }

  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ ok: false, error: 'No TI access token' }, { status: 500 });

    const base = (process.env.TI_FIN_BASE || '').replace(/\/+$/, '');
    if (!base) return NextResponse.json({ ok: false, error: 'Missing TI_FIN_BASE' }, { status: 500 });

    const isTest = (process.env.TI_ORDER_MODE || process.env.NEXT_PUBLIC_TI_ORDER_MODE) === 'test';
    const docId = isTest ? '5999999999' : params.docId;
    const url = `${base}/${encodeURIComponent(params.orderId)}/financial-documents/${encodeURIComponent(docId)}${isTest ? '/test' : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
      cache: 'no-store'
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, status: res.status, error: text || 'Doc download failed', url }, { status: res.status });
    }

    const blob = await res.arrayBuffer();
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${docId}.pdf"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Doc stream failed' }, { status: 500 });
  }
}
