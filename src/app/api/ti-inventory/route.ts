/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/ti-inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAPI, ProductInventoryService } from '@/ti-inventory-client';
import { getToken } from '@/lib/ti-oauth';

export async function POST(req: NextRequest) {
  const { partNumber } = (await req.json()) as { partNumber?: string };
  if (!partNumber) {
    return NextResponse.json({ error: 'Missing partNumber' }, { status: 400 });
  }

  try {
    const token = await getToken();

    // Konfiguracja klienta OpenAPI
    OpenAPI.BASE    = 'https://transact.ti.com/v2';
    OpenAPI.HEADERS = { Authorization: `Bearer ${token}` };
    // alternatywa: OpenAPI.TOKEN = async () => token;

    // ⬇️ kluczowa zmiana: pierwszy parametr to string (tiPartNumber), drugi to currency
    const data = await ProductInventoryService.getProductInformation(partNumber, 'USD');

    return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('TI Inventory error:', error.message);
    } else {
      console.error('TI Inventory error (non-Error):', error);
    }

    const status =
      error instanceof Error && (error as any).response?.status
        ? (error as any).response.status
        : 500;

    const message =
      error instanceof Error ? error.message : 'TI Inventory request failed';

    return NextResponse.json({ error: message }, { status });
  }
}

