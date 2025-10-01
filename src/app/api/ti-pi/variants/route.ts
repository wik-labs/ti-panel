import { NextResponse } from 'next/server';

const BASE = process.env.TI_PI_BASE ?? 'https://api.ti.com/product-information';
const KEY  = process.env.TI_PI_KEY || '';

function headers() {
  // PI akceptuje 'apikey'; w części kont nadal działa też 'Ocp-Apim-Subscription-Key'
  return {
    Accept: 'application/json',
    apikey: KEY,
    'Ocp-Apim-Subscription-Key': KEY,
  } as Record<string, string>;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gpn = (searchParams.get('gpn') || '').trim();

  if (!gpn) {
    return NextResponse.json({ ok: false, error: 'Missing gpn' }, { status: 400 });
  }
  if (!KEY) {
    return NextResponse.json({ ok: false, error: 'Missing TI_PI_KEY' }, { status: 500 });
  }

  // Najczęściej spotykany, zgodny z YAML:
  const attempts = [
    `${BASE}/v1/products?genericProductIdentifier=${encodeURIComponent(gpn)}&include=orderablePartNumbers,description&page=1&size=200`,
    // alternatywne ścieżki gdyby pierwszy wariant nie istniał w Twojej subskrypcji
    `${BASE}/v1/products/search?genericProductIdentifier=${encodeURIComponent(gpn)}&include=orderablePartNumbers,description&page=1&size=200`,
  ];

  let lastStatus = 0;
  let lastBody: any = null;

  for (const url of attempts) {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' });
    lastStatus = res.status;
    const text = await res.text();
    try { lastBody = text ? JSON.parse(text) : null; } catch { lastBody = text; }

    if (res.ok) {
      // Normalizacja: różne konta zwracają data/products
      const items =
        (lastBody?.products ?? lastBody?.data ?? [])
          .map((p: any) => ({
            genericProductIdentifier: p?.genericProductIdentifier ?? p?.genericProductId ?? gpn,
            description: p?.description ?? '',
            orderablePartNumbers: (p?.orderablePartNumbers ?? []).map((o: any) => ({
              tiPartNumber: o?.orderablePartNumber ?? o?.tiPartNumber ?? o,
            })),
          }));

      return NextResponse.json({ ok: true, gpn, variants: items, source: url }, { status: 200 });
    }
  }

  return NextResponse.json(
    { ok: false, status: lastStatus, error: lastBody, attempted: attempts },
    { status: lastStatus || 500 },
  );
}
