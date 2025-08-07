// src/app/api/ti-inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAPI, ProductInventoryService } from '@/ti-inventory-client';
import { getToken } from '@/lib/ti-oauth';

export async function POST(req: NextRequest) {
  const { partNumber } = (await req.json()) as { partNumber?: string };
  if (!partNumber) {
    return NextResponse.json(
      { error: 'Missing partNumber' },
      { status: 400 }
    );
  }

  try {
    // 1) Pobieramy token
    const token = await getToken();

    // 2) Konfigurujemy bazowy URL i nagłówek Authorization
    OpenAPI.BASE    = 'https://transact.ti.com/v2';
    OpenAPI.HEADERs = { Authorization: `Bearer ${token}` };

    // 3) Wywołujemy właściwą metodę z wygenerowanego klienta
    const data = await ProductInventoryService.getProductInformation({
      tiPartNumber: partNumber,
      currency: 'USD',
    });

    // 4) Zwracamy dane
    return NextResponse.json(data, { status: 200 });

  } catch (err: any) {
    console.error('TI Inventory error:', err);
    const status = err.response?.status || 500;
    return NextResponse.json(
      { error: err.message || 'TI Inventory request failed' },
      { status }
    );
  }
}

