import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

const BASE = process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com';
const ORDER_MODE =
  (process.env.TI_ORDER_MODE ?? process.env.NEXT_PUBLIC_TI_ORDER_MODE ?? 'test')
    .toString()
    .toLowerCase(); // 'test' | 'live'

const DEBUG = (process.env.TI_DEBUG_ORDER ?? '0') === '1';

function buildCreateUrl(mode: string) {
  return mode === 'live'
    ? `${BASE}/v2/store/orders/`
    : `${BASE}/v2/store/orders/test`;
}

function safeParse(text: string | null) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const ui = (await req.json()) as any;     // może być { order: {...} } albo „płasko”
    const mode = (ui?.mode ?? ORDER_MODE)?.toString().toLowerCase();
    const url = buildCreateUrl(mode);

    // ── weź źródło pól z koperty lub z root ───────────────────────────
    const hasEnvelope = ui && typeof ui.order === 'object' && ui.order !== null;
    const src = hasEnvelope ? ui.order : ui;

    // profileId / checkoutProfileId
    const checkoutProfileId =
      (src?.checkoutProfileId ??
        src?.profileId ??
        src?.profile?.checkoutProfileId ??
        src?.profile?.id ??
        '')
        .toString()
        .trim();

    // kandydaci na linie
    let lines =
      src?.lineItems ??
      src?.orderLineItems ??
      src?.lines ??
      src?.items ??
      src?.cartLines ??
      src?.cart ??
      [];

    if (!Array.isArray(lines)) lines = [];

    if (!checkoutProfileId) {
      return NextResponse.json(
        { ok: false, error: 'Missing checkoutProfileId (UI: profileId / checkoutProfileId / order.checkoutProfileId)' },
        { status: 400 },
      );
    }
    if (lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Missing line items (UI: lineItems / orderLineItems / lines / cartLines)' },
        { status: 400 },
      );
    }

    // ── zbuduj LEGACY payload zgodny z działającą wersją ───────────────
    const legacyOrder: any = {
      checkoutProfileId,
      customerPurchaseOrderNumber:
        src?.customerPurchaseOrderNumber ?? src?.po ?? `TEST-PO-${Date.now()}`,
      expediteShipping: !!(src?.expediteShipping ?? src?.expedite),
      customerOrderComments: src?.comment ? [{ message: String(src.comment) }] : src?.customerOrderComments,
      // najważniejsze – używamy lineItems
      lineItems: lines.map((l: any, i: number) => ({
        customerLineItemNumber: Number(l?.customerLineItemNumber ?? l?.lineNo ?? i + 1),
        tiPartNumber: String(l?.tiPartNumber ?? l?.pn ?? l?.part ?? ''),
        quantity: Number(l?.quantity ?? l?.qty ?? 0),
      })),
      // testowa wersja legacy miała też datę zamówienia
      purchaseOrderDate: (src?.purchaseOrderDate && new Date(src.purchaseOrderDate).toString() !== 'Invalid Date')
        ? new Date(src.purchaseOrderDate).toISOString()
        : new Date().toISOString(),
    };

    // Jeśli przyszła koperta – połącz „lekko”, ale normalizuj klucze
    if (hasEnvelope) {
      const incoming = { ...ui.order };
      // zamień orderLineItems -> lineItems jeśli trzeba
      if (!incoming.lineItems && Array.isArray(incoming.orderLineItems)) {
        incoming.lineItems = incoming.orderLineItems.map((l: any, i: number) => ({
          customerLineItemNumber: Number(l?.customerLineItemNumber ?? l?.lineNo ?? i + 1),
          tiPartNumber: String(l?.tiPartNumber ?? ''),
          quantity: Number(l?.quantity ?? 0),
        }));
        delete incoming.orderLineItems;
      }
      // dopnij purchaseOrderDate jeśli brak
      if (!incoming.purchaseOrderDate) {
        incoming.purchaseOrderDate = legacyOrder.purchaseOrderDate;
      }
      // jeśli payment to LOC (domyślne dla profilu), usuń – legacy tak działało
      if (incoming.payment && String(incoming.payment.type).toLowerCase() === 'tiloc') {
        delete incoming.payment;
      }
      // scal minimalnie nadpisując legacy tym, co przyszło
      Object.assign(legacyOrder, incoming);
    }

    // ostateczna koperta
    const payload = { order: legacyOrder };

    if (DEBUG) {
      const first = legacyOrder?.lineItems?.[0];
      console.log('[TI][CREATE][REQ]', JSON.stringify({
        url, mode, checkoutProfileId,
        lineCount: legacyOrder?.lineItems?.length,
        firstLine: first,
        hasPayment: !!legacyOrder?.payment,
        poLen: String(legacyOrder?.customerPurchaseOrderNumber ?? '').length,
      }));
    }

    // ── call TI ─────────────────────────────────────────────────────────
    const token = await getAccessToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const correlationId = res.headers.get('x-ti-correlation-id');
    const raw = await res.text();
    const data = safeParse(raw);

    if (!res.ok) {
      if (DEBUG) {
        console.log('[TI][CREATE][RES]', JSON.stringify({
          status: res.status,
          correlationId,
          headers: { 'x-ti-correlation-id': correlationId, 'content-type': res.headers.get('content-type') },
          bodySnippet: raw?.slice(0, 4000),
        }));
      }
      return NextResponse.json(
  { ok: false, status: res.status, endpoint: url, correlationId, error: (data ?? raw ?? 'Unknown error') },
  { status: res.status },
);

    }

    return NextResponse.json(
      { ok: true, result: data, endpoint: url, correlationId },
      { status: 201 },
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unhandled error' }, { status: 500 });
  }
}
