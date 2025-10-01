// src/app/api/ti-products/search/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

// wymuś Node (nie Edge), żeby działał fetch+Bearer
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



const PI_BASE = process.env.TI_PI_BASE?.replace(/\/+$/, '') || 'https://transact.ti.com/v1';

/**
 * GET /api/ti-products/search?gpn=SN74HC00&page=1&size=50
 * Zwraca warianty (OPN) dla GenericProductIdentifier (GPN).
 * - UI używa paginacji 1-based
 * - TI wymaga 0-based: ?Page=0&Size=50
 */
export async function GET(req: Request) {
  const urlIn = new URL(req.url);
  const gpn = (urlIn.searchParams.get('gpn') || '').trim();

  if (!gpn) {
    return NextResponse.json(
      { ok: false, status: 400, error: 'Query param "gpn" is required' },
      { status: 400 },
    );
  }

  // UI -> 1-based; TI -> 0-based
  const rawPage = Number(urlIn.searchParams.get('page') || '1');
  const sizeIn = Number(urlIn.searchParams.get('size') || '50');

  const page = Math.max(0, isFinite(rawPage) ? Math.floor(rawPage) - 1 : 0);
  const size = Math.min(100, Math.max(1, isFinite(sizeIn) ? Math.floor(sizeIn) : 50));

  const outUrl =
    `${PI_BASE}/products` +
    `?GenericProductIdentifier=${encodeURIComponent(gpn)}` +
    `&Page=${page}&Size=${size}`;

  let token: string | null = null;
  try {
    token = await getAccessToken();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, status: 401, error: 'Could not obtain TI access token' },
      { status: 401 },
    );
  }

  try {
    const res = await fetch(outUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      // nie keszuj w Next
      cache: 'no-store',
    });

    const status = res.status;
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // leave body as text
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status,
          error: body ?? text ?? `HTTP ${status}`,
          attempted: [outUrl],
        },
        { status },
      );
    }

    // Spec PI v1: struktura paginacji w polach Content / Number / Size / TotalPages / TotalElements
    const content: any[] = Array.isArray(body?.Content) ? body.Content : [];

    // Różne nazwy pola na OPN w zależności od rodziny produktów. Obsłużmy kilka spotykanych.
    const items = content
      .map((it) => {
        const opn =
          it?.Identifier ??
          it?.OrderablePartNumber ??
          it?.TiPartNumber ??
          it?.OPN ??
          null;

        if (!opn) return null;

        return {
          tiPartNumber: String(opn),
          description: it?.Description ?? undefined,
          genericPartNumber: gpn,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      data: {
        gpn,
        items,
        page: (body?.Number ?? page) + 1, // oddaj 1-based do UI
        size: body?.Size ?? size,
        totalPages: body?.TotalPages ?? undefined,
        total: body?.TotalElements ?? undefined,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: e?.message || 'Fetch failed',
        attempted: [outUrl],
      },
      { status: 500 },
    );
  }
}
