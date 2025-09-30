// src/app/api/ti-order/create/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

export const runtime = 'nodejs';

/* ───────────────── helpers ───────────────── */

function computeOrdersBase(): string {
  const explicit = process.env.TI_ORDER_BASE;
  if (explicit) return explicit.replace(/\/+$/, '');

  const storeBase =
    process.env.NEXT_PUBLIC_TI_STORE_BASE ||
    process.env.TI_STORE_BASE ||
    'https://transact.ti.com';

  return `${storeBase.replace(/\/+$/, '')}/v2/store/orders`;
}

function isTestMode(bodyMode?: string): boolean {
  const envMode = (process.env.TI_ORDER_MODE || process.env.NEXT_PUBLIC_TI_ORDER_MODE || 'test').toLowerCase();
  const mode = (bodyMode || envMode).toLowerCase();
  return mode === 'test';
}

function looksLikeProfileId(v: unknown): boolean {
  const s = String(v ?? '');
  return s.length >= 24 && /^[A-Za-z0-9]+$/.test(s);
}

function sanitizePO(po?: string): string {
  const raw = (po ?? '').trim();
  // dozwolone znaki: litery/cyfry/spacja/-/_
  const safe = raw.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 40);
  return safe || `TEST-PO-${Date.now()}`;
}

type UiBody = {
  profileId?: string;
  checkoutProfileId?: string;
  checkoutProfile?: string; // czasem UI przynosi taką nazwę
  po?: string;
  customerPurchaseOrderNumber?: string;
  comment?: string;
  expedite?: boolean;
  expediteShipping?: boolean;
  lines?: Array<{ tiPartNumber?: string; part?: string; pn?: string; tiPN?: string; quantity?: number; qty?: number }>;
  orderLineItems?: Array<{ tiPartNumber: string; quantity: number }>;
  mode?: 'test' | 'prod' | 'live';
  payment?: { type?: string; method?: string };
};

function normalizeToTiPayload(ui: UiBody) {
  const checkoutProfileId =
    ui.checkoutProfileId ??
    ui.profileId ??
    (looksLikeProfileId(ui.checkoutProfile) ? ui.checkoutProfile : undefined);

  const rawLines =
    (Array.isArray(ui.orderLineItems) && ui.orderLineItems) ||
    (Array.isArray(ui.lines) && ui.lines) ||
    [];

  const orderLineItems = rawLines
    .map((l: any, i: number) => {
      const tiPartNumber = l?.tiPartNumber ?? l?.tiPN ?? l?.part ?? l?.pn;
      const quantity = Number(l?.quantity ?? l?.qty);
      if (!tiPartNumber || !quantity || quantity <= 0) return null;
      return {
        tiPartNumber,
        quantity,
        customerLineItemNumber: String(i + 1),
      };
    })
    .filter(Boolean);

  const customerPurchaseOrderNumber = sanitizePO(
    ui.customerPurchaseOrderNumber ?? ui.po
  );

  const expediteShipping =
    typeof ui.expediteShipping === 'boolean' ? ui.expediteShipping : !!ui.expedite;

  // domyślny payment (LOC) – często wymagany na testowym środowisku TI
  const payment =
    ui.payment && (ui.payment.type || ui.payment.method)
      ? { type: ui.payment.type ?? 'tiloc', method: ui.payment.method ?? 'LOC' }
      : { type: 'tiloc', method: 'LOC' };

  const customerOrderComments =
    ui.comment && ui.comment.trim() ? [{ message: ui.comment.trim() }] : undefined;

  return {
    checkoutProfileId,
    customerPurchaseOrderNumber,
    customerOrderComments,
    expediteShipping,
    orderLineItems,
    payment,
  };
}

async function fetchWithRetry(url: string, token: string, body: any) {
  let lastText = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const correlationId =
      res.headers.get('x-ti-correlation-id') ||
      res.headers.get('x-correlation-id') ||
      res.headers.get('x-request-id') ||
      null;

    lastText = await res.text();
    let data: any = null;
    try {
      data = lastText ? JSON.parse(lastText) : null;
    } catch {}

    if (res.ok) {
      return { ok: true, status: res.status, correlationId, data, raw: lastText, res };
    }

    // retry tylko na 5xx
    if (res.status >= 500 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 800));
      continue;
    }

    return { ok: false, status: res.status, correlationId, data, raw: lastText, res };
  }

  return { ok: false, status: 503, correlationId: null, data: null, raw: lastText, res: undefined };
}

/* ───────────────── route ───────────────── */

export async function POST(req: Request) {
  const debug = process.env.TI_DEBUG === '1';

  try {
    const base = computeOrdersBase(); // np. https://transact.ti.com/v2/store/orders

    // body z UI
    let ui: UiBody = {};
    try {
      ui = await req.json();
    } catch {
      ui = {};
    }

    const isTest = isTestMode(ui.mode);
    const url = `${base}${isTest ? '/test' : ''}`; // POST /v2/store/orders[/test]

    // normalizacja do formatu TI
    const tiBody = normalizeToTiPayload(ui);

    // minimalna walidacja lokalna
    if (!tiBody.checkoutProfileId || !Array.isArray(tiBody.orderLineItems) || tiBody.orderLineItems.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          status: 400,
          error: 'Invalid payload: checkoutProfileId and orderLineItems are required.',
          receivedShape: {
            hasCheckoutProfileId: !!tiBody.checkoutProfileId,
            orderLineItemsCount: Array.isArray(tiBody.orderLineItems) ? tiBody.orderLineItems.length : 0,
            uiKeys: Object.keys(ui || {}),
          },
          hint:
            'Wymagane: checkoutProfileId (ID profilu) + orderLineItems[{tiPartNumber, quantity}]. ' +
            'Aliasowane: profileId/checkoutProfileId/checkoutProfile, lines/orderLineItems; po/customerPurchaseOrderNumber; expedite/expediteShipping.',
        },
        { status: 400 }
      );
    }

    // token OAuth
    const token = await getAccessToken();

    // ── LOG REQ (claims + shape)
    if (debug) {
      try {
        const parts = token.split('.');
        const claims = parts[1] ? JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) : null;
        // nie logujemy pełnego body ze względów bezpieczeństwa — tylko najważniejsze pola
        console.log('[TI][CREATE][REQ]', JSON.stringify({
          url,
          mode: isTest ? 'test' : 'prod',
          checkoutProfileId: tiBody.checkoutProfileId,
          lineCount: tiBody.orderLineItems.length,
          firstLine: tiBody.orderLineItems[0],
          payment: tiBody.payment,
          poLen: tiBody.customerPurchaseOrderNumber?.length ?? 0,
          token: claims && { client_id: claims.client_id, aud: claims.aud, scope: claims.scope }
        }));
      } catch (e) {
        console.log('[TI][CREATE][REQ][claims-error]', String(e));
      }
    }

    // call TI
    const result = await fetchWithRetry(url, token, tiBody);

    // ── LOG RES (status + corr id + snippet)
    if (debug && result?.res) {
      const res = result.res;
      const corr =
        res.headers.get('x-ti-correlation-id') ||
        res.headers.get('x-correlation-id') ||
        res.headers.get('x-request-id') ||
        null;
      console.log('[TI][CREATE][RES]', JSON.stringify({
        status: res.status,
        correlationId: corr,
        headers: {
          'x-ti-correlation-id': corr,
          'content-type': res.headers.get('content-type') || null
        },
        bodySnippet: result.raw ? String(result.raw).slice(0, 500) : null
      }));
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: result.status,
          endpoint: url,
          correlationId: result.correlationId,
          payloadPreview: {
            checkoutProfileId: tiBody.checkoutProfileId,
            lines: tiBody.orderLineItems.length,
            expediteShipping: !!tiBody.expediteShipping,
            hasPayment: !!tiBody.payment,
          },
          // na czas debugowania zwracamy całe body wysłane do TI
          payloadSent: tiBody,
          error: result.data ?? result.raw ?? 'Create failed',
          hint:
            'Jeśli to 5xx z TI, spróbuj ponownie lub zgłoś z correlationId. ' +
            'Upewnij się, że używasz OPN (np. SN74HC00N), a nie GPN (SN74HC00).',
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      result: result.data,
      meta: { url, correlationId: result.correlationId },
    });
  } catch (e: any) {
    if (debug) console.log('[TI][CREATE][CRASH]', String(e?.stack || e));
    return NextResponse.json(
      { ok: false, status: 500, error: e?.message ?? 'create crashed' },
      { status: 500 }
    );
  }
}
