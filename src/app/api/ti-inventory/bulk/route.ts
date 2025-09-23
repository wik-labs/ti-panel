// src/app/api/ti-inventory/bulk/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { parts, ccy = 'USD' } = await req.json() as { parts: string[]; ccy?: string };
    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ ok:false, error:'Provide parts: string[]' }, { status:400 });
    }

    const results: Record<string, any> = {};
    for (const pn of parts) {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/ti-inventory/part?pn=${encodeURIComponent(pn)}&ccy=${ccy}`);
      results[pn] = await r.json();
    }
    return NextResponse.json({ ok:true, results });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message ?? 'Unknown' }, { status:500 });
  }
}
