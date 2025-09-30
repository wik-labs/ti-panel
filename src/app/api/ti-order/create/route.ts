import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

export const runtime = 'nodejs';

type UiBody = {
  profileId?: string;                 // z Twojego UI
  checkoutProfileId?: string;         // alternatywa
  po?: string;
  customerPurchaseOrderNumber?: string;
  comment?: string;
  expedite?: boolean;
  expediteShipping?: boolean;
  lines?: Array<{ tiPartNumber: string; quantity: number }>;
  orderLineItems?: Array<{ tiPartNumber: string; quantity: number }>;
  mode?: 'test' | 'live';
};

function buildTiBody(ui: UiBody) {
  const checkoutProfileId =
    ui.checkoutProfileId ??
    ui.profileId; // <-- akceptujemy oba

  const orderLineItems =
    (ui.orderLineItems && Array.isArray(ui.orderLineItems) ? ui.orderLineItems : null) ??
    (ui.lines && Array.isArray(ui.lines) ? ui.lines : null) ??
    [];

  const body = {
    checkoutProfileId,
    customerPurchaseOrderNumber:
      ui.customerPurchaseOrderNumber ??
      ui.po ??
      `TEST-PO-${Date.now()}`,
    customerOrderComments:
      ui.comment && ui.comment.trim() ? [{ message: ui.comment.trim() }] : undefined,
    expediteShipping:
      typeof ui.expediteShipping === 'boolean'
        ? ui.expediteShipping
        : !!ui.expedite,
    orderLineItems: orderLineItems.map((l, i) => ({
      tiPartNumber: l.tiPartNumber,
      quantity: Number(l.quantity),
      customerLineItemNumber: String(i + 1),
    })),
  };

  return body;
}

function modeIsTest(uiMode?: string) {
  const envMode = (process.env.TI_ORDER_MODE || process.env.NEXT_PUBLIC_TI_ORDER_MODE || 'test').toLowerCase();
  const m = (uiMode || envMode).toLowerCase();
  return m === 'test';
}

async function fetchTi(url: string, token: string, payload: any) {
  // proste retry na 5xx (np. czasowe 503 po ich stronie)
  let lastText = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    lastText = await res.text();
    if (res.ok) {
      try { return { ok: true, json: lastText ? JSON.parse(lastText) : null, status: res.status }; }
      catch { return { ok: true, json: null, raw: lastText, status: res.status }; }
    }

    // tylko na 5xx podejmij drugą próbę
    if (res.status >= 500 && attempt === 0) {
      await new Promise(r => setTimeout(r, 700));
      continue;
    }

    let err: any = null;
    try { err = lastText ? JSON.parse(lastText) : null; } catch {}
    return { ok: false, status: res.status, err, raw: lastText };
  }
  // jeżeli tu trafimy, to po 2 próbach nadal 5xx
  let err: any = null;
  try { err = lastText ? JSON.parse(lastText) : null; } catch {}
  return { ok: false, status: 503, err, raw: lastText };
}

export async function POST(req: Request) {
  try {

function computeOrdersBase() {
  const explicit = process.env.TI_ORDER_BASE;
  if (explicit) return explicit.replace(/\/+$/, '');

  const storeBase =
    process.env.NEXT_PUBLIC_TI_STORE_BASE ||
    process.env.TI_STORE_BASE ||
    'https://transact.ti.com';

  return `${storeBase.replace(/\/+$/, '')}/v2/store/orders`;
}

const base = computeOrdersBase();

    if (!base) {
      return NextResponse.json({ ok: false, error: 'Missing TI_ORDER_BASE env' }, { status: 500 });
    }

    // wczytaj body z UI
    let ui: UiBody = {};
    try {
      ui = await req.json();
    } catch {
      ui = {};
    }

    // zbuduj TI payload
    const tiBody = buildTiBody(ui);

    // minimalna walidacja
    if (!tiBody.checkoutProfileId || !Array.isArray(tiBody.orderLineItems) || !tiBody.orderLineItems.length) {
      return NextResponse.json(
        {
          ok: false,
          status: 400,
          error: 'Invalid payload: checkoutProfileId and orderLineItems are required.',
          received: {
            checkoutProfileId: tiBody.checkoutProfileId ?? null,
            orderLineItemsCount: Array.isArray(tiBody.orderLineItems) ? tiBody.orderLineItems.length : 0,
            uiKeys: Object.keys(ui || {}),
          },
        },
        { status: 400 },
      );
    }

    const token = await getAccessToken();
    const isTest = modeIsTest(ui.mode);
    const url = `${base}${isTest ? '/test' : ''}`; // POST /v2/store/orders[/test]

    const { ok, json, err, raw, status } = await fetchTi(url, token, tiBody);
    if (!ok) {
      return NextResponse.json(
        {
          ok: false,
          status,
          endpoint: url,
          payloadPreview: {
            checkoutProfileId: tiBody.checkoutProfileId,
            lines: tiBody.orderLineItems.length,
            expediteShipping: !!tiBody.expediteShipping,
          },
          error: err ?? raw ?? 'Create failed',
          hint:
            'Jeśli to 5xx z TI, spróbuj ponownie. Upewnij się, że TI_ORDER_BASE to root /v2/store/orders (bez /test), ' +
            'a tryb wybiera się przez TI_ORDER_MODE lub body.mode.',
        },
        { status },
      );
    }

    return NextResponse.json({ ok: true, result: json, meta: { url } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'create crashed' }, { status: 500 });
  }
}
