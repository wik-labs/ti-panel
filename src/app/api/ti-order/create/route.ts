import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

export const runtime = 'nodejs';

/** ───────── helpers: base & mode ───────── */
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
  const envMode =
    (process.env.TI_ORDER_MODE ||
      process.env.NEXT_PUBLIC_TI_ORDER_MODE ||
      'test').toLowerCase();
  const mode = (bodyMode || envMode).toLowerCase();
  return mode === 'test';
}

/** ───────── helpers: normalize ───────── */
function looksLikeProfileId(v: unknown): boolean {
  const s = String(v ?? '');
  return s.length >= 24 && /^[A-Za-z0-9]+$/.test(s);
}
function sanitizePO(po?: string): string {
  const raw = (po ?? '').trim();
  const safe = raw.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 40);
  return safe || `TEST-PO-${Date.now()}`;
}

type UiBody = {
  profileId?: string;
  checkoutProfileId?: string;
  checkoutProfile?: string; // czasem nazwa (nie ID)
  po?: string;
  customerPurchaseOrderNumber?: string;
  comment?: string;
  expedite?: boolean;
  expediteShipping?: boolean;
  lines?: Array<{ tiPartNumber?: string; part?: string; pn?: string; tiPN?: string; quantity?: number; qty?: number }>;
  orderLineItems?: Array<{ tiPartNumber: string; quantity: number; customerLineItemNumber?: string }>;
  mode?: 'test' | 'prod' | 'live';
  payment?: { type?: string; method?: string };
};

function normalizeToTiShape(ui: UiBody) {
  // checkoutProfileId ustalimy niżej (może wymagać resolve po nazwie)
  let checkoutProfileId =
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
        customerLineItemNumber: String(l?.customerLineItemNumber ?? i + 1),
      };
    })
    .filter(Boolean);

  const customerPurchaseOrderNumber = sanitizePO(
    ui.customerPurchaseOrderNumber ?? ui.po
  );

  const expediteShipping =
    typeof ui.expediteShipping === 'boolean'
      ? ui.expediteShipping
      : !!ui.expedite;

  const payment =
    ui.payment && (ui.payment.type || ui.payment.method)
      ? { type: ui.payment.type ?? 'tiloc', method: ui.payment.method ?? 'LOC' }
      : { type: 'tiloc', method: 'LOC' };

  const customerOrderComments =
    ui.comment && ui.comment.trim()
      ? [{ message: ui.comment.trim() }]
      : undefined;

  return {
    checkoutProfileId,
    checkoutProfileName: ui.checkoutProfile, // jeśli to nazwa, spróbujemy ją zresolve'ować
    customerPurchaseOrderNumber,
    customerOrderComments,
    expediteShipping,
    orderLineItems,
    payment,
  };
}

/** ───────── helpers: TI calls ───────── */
async function fetchWithRetry(url: string, token: string, body: any) {
  let lastText = '';
  for (let a = 0; a < 3; a++) {
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
    if (res.status >= 500 && a < 2) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 800));
      continue;
    }
    return { ok: false, status: res.status, correlationId, data, raw: lastText, res };
  }
  return { ok: false, status: 503, correlationId: null, data: null, raw: lastText, res: undefined };
}

async function resolveProfileIdByName(token: string, name: string): Promise<string | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_TI_STORE_BASE ||
      process.env.TI_STORE_BASE ||
      'https://transact.ti.com';
    // TI checkout profile list: GET /v2/store/checkout-profiles
    const url = `${base.replace(/\/+$/, '')}/v2/store/checkout-profiles`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const txt = await res.text();
    if (!res.ok) return null;

    const json = txt ? JSON.parse(txt) : null;
    const list: any[] = Array.isArray(json?.checkoutProfiles)
      ? json.checkoutProfiles
      : Array.isArray(json?.data)
      ? json.data
      : [];

    const match = list.find(
      (p: any) =>
        String(p?.checkoutProfileName).trim().toLowerCase() ===
        name.trim().toLowerCase()
    );
    return match?.checkoutProfileId || null;
  } catch {
    return null;
  }
}

/** ───────── debug token meta ───────── */
async function fetchTokenMeta(): Promise<{ client_id?: string; application_name?: string } | null> {
  try {
    const tokenUrl = process.env.TI_TOKEN_URL || 'https://transact.ti.com/v1/oauth/accesstoken';
    const clientId = process.env.TI_CLIENT_ID!;
    const clientSecret = process.env.TI_CLIENT_SECRET!;
    const form = new URLSearchParams();
    form.set('grant_type', 'client_credentials');
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    const r = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form.toString(),
      cache: 'no-store',
    });
    const t = await r.text();
    const j = t ? JSON.parse(t) : {};
    return { client_id: j?.client_id, application_name: j?.application_name };
  } catch {
    return null;
  }
}

/** ───────── route ───────── */
export async function POST(req: Request) {
  const debug = process.env.TI_DEBUG === '1';

  try {
    const base = computeOrdersBase();

    // body z UI
    let ui: UiBody = {};
    try {
      ui = await req.json();
    } catch {
      ui = {};
    }
    const isTest = isTestMode(ui.mode);
    const url = `${base}${isTest ? '/test' : ''}`;

    // normalizacja
    const tiBody = normalizeToTiShape(ui);

    // jeśli mamy nazwę profilu (nie ID) – spróbuj zresolve'ować
    if (!tiBody.checkoutProfileId && tiBody.checkoutProfileName) {
      const tokenForResolve = await getAccessToken();
      const resolved = await resolveProfileIdByName(tokenForResolve, tiBody.checkoutProfileName);
      if (resolved) tiBody.checkoutProfileId = resolved;
    }

    // walidacja minimalna
    if (
      !tiBody.checkoutProfileId ||
      !Array.isArray(tiBody.orderLineItems) ||
      tiBody.orderLineItems.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          status: 400,
          error:
            'Invalid payload: checkoutProfileId and orderLineItems are required. ' +
            'If UI sends checkoutProfile (name), make sure it can be resolved to ID.',
          receivedShape: {
            hasCheckoutProfileId: !!tiBody.checkoutProfileId,
            hasName: !!tiBody.checkoutProfileName,
            orderLineItemsCount: Array.isArray(tiBody.orderLineItems)
              ? tiBody.orderLineItems.length
              : 0,
            uiKeys: Object.keys(ui || {}),
          },
        },
        { status: 400 }
      );
    }

    // token OAuth
    const token = await getAccessToken();

    // LOG REQ
    if (debug) {
      const meta = await fetchTokenMeta();
      console.log(
        '[TI][CREATE][REQ]',
        JSON.stringify({
          url,
          mode: isTest ? 'test' : 'prod',
          checkoutProfileId: tiBody.checkoutProfileId,
          lineCount: tiBody.orderLineItems.length,
          firstLine: tiBody.orderLineItems[0],
          payment: tiBody.payment,
          poLen: tiBody.customerPurchaseOrderNumber?.length ?? 0,
          tokenMeta: meta, // zawiera client_id / application_name
        })
      );
    }

    // call TI
    const result = await fetchWithRetry(url, token, tiBody);

    // LOG RES
    if (debug && result?.res) {
      const res = result.res;
      const corr =
        res.headers.get('x-ti-correlation-id') ||
        res.headers.get('x-correlation-id') ||
        res.headers.get('x-request-id') ||
        null;
      console.log(
        '[TI][CREATE][RES]',
        JSON.stringify({
          status: res.status,
          correlationId: corr,
          headers: {
            'x-ti-correlation-id': corr,
            'content-type': res.headers.get('content-type') || null,
          },
          bodySnippet: result.raw ? String(result.raw).slice(0, 500) : null,
        })
      );
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
