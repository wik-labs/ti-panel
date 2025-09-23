// src/app/api/ti-generic/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

type TiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ProxyBody {
  // Pełny TI URL (np. https://api.ti.com/store/inventory-pricing/v1/products/SN74HC00N)
  url: string;
  method?: TiMethod;                  // domyślnie GET
  payload?: unknown;                  // body dla metod != GET
  headers?: Record<string, string>;   // dodatkowe nagłówki
}

function isTiUrl(url: string) {
  return /^https:\/\/(api|transact)\.ti\.com\//i.test(url);
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseMs = 400): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      // retry tylko na 429 i 5xx
      if (status && status !== 429 && status < 500) throw e;
      await new Promise(r => setTimeout(r, baseMs * Math.pow(2, i)));
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function GET() {
  // Żeby nie było 405 przy wejściu z przeglądarki
  return NextResponse.json({
    message: 'Use POST to proxy a TI API request.',
    example: {
      url: 'https://api.ti.com/store/inventory-pricing/v1/products/SN74HC00N',
      method: 'GET',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProxyBody;

    if (!body?.url || !isTiUrl(body.url)) {
      return NextResponse.json(
        { ok: false, error: 'Provide a valid TI API https://api.ti.com/... URL' },
        { status: 400 }
      );
    }

    const method: TiMethod = (body.method || 'GET').toUpperCase() as TiMethod;
    const token = await getAccessToken();

    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body.headers || {}),
    };
    const headers =
      method === 'GET'
        ? baseHeaders
        : { ...baseHeaders, 'Content-Type': 'application/json' };

    const res = await withRetry(() =>
      fetch(body.url, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(body.payload ?? {}),
      })
    );

    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: parsed }, { status: res.status });
    }

    return NextResponse.json({ ok: true, data: parsed }, { status: 200 });
  } catch (e: any) {
    console.error('TI GENERIC ERROR:', e);
    const status = e?.status ?? e?.response?.status ?? 500;
    const msg = e?.message ?? 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
