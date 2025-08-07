// src/app/api/ti-generic/route.ts
import { NextRequest } from 'next/server';

interface Variant {
  tiPartNumber: string;
  // tu doklej inne pola, które będziesz chciał zwracać
}

interface CatalogResponse {
  products?: Variant[];
}

let cachedToken = '';
let expiresAt   = 0;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < expiresAt) return cachedToken;

  const creds = `${process.env.TI_CLIENT_ID}:${process.env.TI_CLIENT_SECRET}`;
  const resp = await fetch('https://transact.ti.com/v1/oauth/accesstoken', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(creds).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) throw new Error(`Token fetch failed: ${resp.status}`);

  const body = await resp.json() as { access_token: string; expires_in: number };
  cachedToken = body.access_token;
  expiresAt   = now + body.expires_in * 1000 - 30_000;
  return cachedToken;
}

export async function POST(req: NextRequest) {
  // 1) Parsujemy ciało
  const { generic } = (await req.json()) as { generic?: string };
  if (!generic) {
    return new Response(JSON.stringify({ error: 'Missing genericPartNumber' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getToken();
    const url = `https://transact.ti.com/v2/store/products/catalog?genericPartNumber=${encodeURIComponent(generic)}&currency=USD`;

    const tiResp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/json',
      },
    });

    // 2) Obsługa błędów TI
    if (!tiResp.ok) {
      const text = await tiResp.text();
      console.error('TI API error', tiResp.status, text);
      return new Response(
        JSON.stringify({ error: 'TI API request failed', status: tiResp.status }),
        { status: tiResp.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3) Parsujemy odpowiedź jako unknown i redukujemy do Variant[]
    const raw = (await tiResp.json()) as unknown;
    let variants: Variant[] = [];

    if (Array.isArray(raw)) {
      // czasami TI zwraca od razu tablicę
      variants = raw as Variant[];
    } else if (
      typeof raw === 'object' &&
      raw !== null &&
      'products' in raw &&
      Array.isArray((raw as CatalogResponse).products)
    ) {
      // typowy przypadek: { products: [ ... ] }
      variants = (raw as CatalogResponse).products!;
    }

    return new Response(JSON.stringify(variants), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Generic search error', err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

