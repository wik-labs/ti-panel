// src/app/api/ti-generic/route.ts
import { NextRequest } from 'next/server';

interface CacheEntry {
  timestamp: number;
  data: any[];
}

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 godziny w ms
const cache = new Map<string, CacheEntry>();

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

  const { access_token, expires_in } = await resp.json();
  cachedToken = access_token;
  expiresAt   = now + expires_in * 1000 - 30_000;
  return cachedToken;
}

export async function POST(req: NextRequest) {
  const { generic } = (await req.json()) as { generic: string };
  if (!generic) {
    return new Response(
      JSON.stringify({ error: 'Missing genericPartNumber' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1) Sprawdź cache
  const entry = cache.get(generic);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify(entry.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getToken();
    const url = `https://transact.ti.com/v2/store/products/catalog?genericPartNumber=${encodeURIComponent(generic)}&currency=USD`;
    const tiResp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const text = await tiResp.text();
    if (!tiResp.ok) {
      console.error('TI API error', tiResp.status, text);

      // 2) Jeśli mamy stare cache → zwróć je
      if (entry) {
        return new Response(JSON.stringify(entry.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ error: 'TI API request failed', status: tiResp.status }),
        { status: tiResp.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const json = JSON.parse(text);
    const variants = Array.isArray(json) ? json : json.products || [];

    // 3) Nadpisz cache
    cache.set(generic, {
      timestamp: Date.now(),
      data: variants,
    });

    return new Response(JSON.stringify(variants), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Generic search error', err);
    if (entry) {
      // fallback do cache, nawet przy błędzie
      return new Response(JSON.stringify(entry.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

