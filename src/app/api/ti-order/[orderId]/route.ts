import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

const BASE = process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com';

// Konfiguracja: domyślny tryb z env (ale i tak auto-wykryjemy po numerze)
const ENV_MODE = (
  process.env.TI_ORDER_MODE ??
  process.env.NEXT_PUBLIC_TI_ORDER_MODE ??
  'test'
).toLowerCase() as 'test' | 'live';

// Prosty backoff (nie jest obowiązkowy, ale pomaga przy flarach sieciowych)
async function withRetry<T>(fn: () => Promise<T>, tries = 2, baseMs = 250): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) {
        await new Promise(r => setTimeout(r, baseMs * (2 ** i)));
      }
    }
  }
  throw lastErr;
}

export async function GET(_req: Request, ctx: { params: { orderId: string } }) {
  const orderId = ctx?.params?.orderId;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'Missing orderId' }, { status: 400 });
  }

  // 1) Autodetekcja: testowe zamówienia z TI zwykle zaczynają się od „T”
  const looksTest = /^t\d+/i.test(orderId);
  // 2) Kolejność prób: najpierw tryb z env, ale jeśli 404 – spróbuj drugi.
  const preferred: Array<'test' | 'live'> = ENV_MODE === 'test'
    ? (looksTest ? ['test', 'live'] : ['test', 'live'])   // i tak sprawdzimy oba
    : (looksTest ? ['live', 'test'] : ['live', 'test']);

  const attempted: Array<{ url: string; status?: number }> = [];

  try {
    const token = await getAccessToken();

    // Funkcja pobierająca z danego trybu i normalizująca wynik do result.orderInfo
    const tryFetch = async (mode: 'test' | 'live') => {
      const url = `${BASE}/v2/store/orders/${encodeURIComponent(orderId)}${mode === 'test' ? '/test' : ''}`;
      const res = await withRetry(() => fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }));

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      attempted.push({ url, status: res.status });

      if (!res.ok) {
        // Zwróć błąd wyżej – obsłużymy po pętli
        const errBody = json?.errors ?? json?.error ?? json ?? `HTTP ${res.status}`;
        const e = new Error(typeof errBody === 'string' ? errBody : 'TI retrieve failed') as any;
        e.__ti = { status: res.status, json: errBody };
        throw e;
      }

      const orderInfo = json?.orderInfo ?? json;
      return { ok: true, result: { orderInfo } };
    };

    // 3) Spróbuj w preferowanej kolejności; jeśli 404 – leć dalej
    let lastError: any = null;
    for (const mode of preferred) {
      try {
        const out = await tryFetch(mode);
        return NextResponse.json(out, { status: 200 });
      } catch (e: any) {
        lastError = e;
        const st = e?.__ti?.status;
        // Jeśli 404 – próbujemy drugi wariant; inne kody przerywają
        if (st !== 404) break;
      }
    }

    // 4) Tutaj już nic nie wyszło – zwróć błąd z diagnostyką
    const status = lastError?.__ti?.status ?? 500;
    const error = lastError?.__ti?.json ?? lastError?.message ?? 'Retrieve failed';
    return NextResponse.json(
      { ok: false, status, error, attempted },
      { status }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, status: 500, error: e?.message ?? 'Retrieve failed', attempted },
      { status: 500 }
    );
  }
}
