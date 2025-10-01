'use client';

import React, { useEffect, useMemo, useState } from 'react';

/** ===== Typy minimalne pod to UI ===== */
type PriceBreak = { priceBreakQuantity: number; price: number };
type PricingRow = { currency: string; priceBreaks: PriceBreak[] };
type Product = {
  tiPartNumber: string;
  genericPartNumber?: string;
  buyNowUrl?: string;
  quantity?: number;
  pricing?: PricingRow[];
  futureInventory?: Array<{ forecastDate?: string; forecastQuantity?: number }>;
  description?: string;
  minimumOrderQuantity?: number;
  standardPackQuantity?: number;
  exportControlClassificationNumber?: string; // ECCN
  htsCode?: string;
  pinCount?: number;
  packageType?: string;
  packageCarrier?: string; // CUT TAPE / REEL / TUBE itp.
  customReel?: boolean;
  lifeCycle?: string; // ACTIVE, NRND, itp.
};

type VariantBrief = {
  tiPartNumber: string;
  genericPartNumber?: string;
  description?: string;
};

/** ====== proste style (dark) ====== */
const card = {
  background: '#0b0f17',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 16,
} as const;

const row = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
} as const;

const field = {
  background: '#0a0e15',
  border: '1px solid #1f2937',
  borderRadius: 10,
  padding: 12,
  minHeight: 56,
} as const;

const badge = {
  display: 'inline-block',
  fontSize: 12,
  padding: '2px 8px',
  borderRadius: 999,
  border: '1px solid #1f2937',
  background: '#101826',
} as const;

/** ====== Pomocnicze ====== */
function fmt(n?: number, ccy = 'USD') {
  if (typeof n !== 'number') return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: ccy,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2) + ' ' + ccy;
  }
}

function pickUnitPrice(pricing: PricingRow[] | undefined, qty: number, ccy: string) {
  if (!pricing || !pricing.length) return undefined;
  const row = pricing.find((p) => p.currency === ccy) ?? pricing[0];
  if (!row) return undefined;
  const sorted = [...row.priceBreaks].sort((a, b) => a.priceBreakQuantity - b.priceBreakQuantity);
  let price = sorted[0]?.price;
  for (const b of sorted) {
    if (qty >= b.priceBreakQuantity) price = b.price;
    else break;
  }
  return price;
}

function isGpnNotFoundErrorPayload(payload: any): boolean {
  const arr =
    (Array.isArray(payload?.errors) && payload.errors) ||
    (Array.isArray(payload?.error?.errors) && payload.error.errors) ||
    (Array.isArray(payload?.error) && payload.error) ||
    [];
  return arr.some(
    (e: any) =>
      (e?.errorCode === 'ERR-TICOM-INV-API-1002' || e?.type === 'ResourceNotFound') &&
      (e?.field === 'tiPartNumber' || e?.section === 'Path')
  );
}

/** ====== Koszyk w localStorage (prosto) ====== */
function addToCart(line: { tiPartNumber: string; quantity: number; unitPrice?: number; currency?: string }) {
  try {
    const raw = localStorage.getItem('ti-cart');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ ...line, ts: Date.now() });
    localStorage.setItem('ti-cart', JSON.stringify(arr));
    // event dla innych zakładek
    window.dispatchEvent(new CustomEvent('ti-cart:updated'));
  } catch {}
}

/** ===== Komponent strony ===== */
export default function InventoryPage() {
  /** UI state */
  const [pn, setPn] = useState('SN74HCS03DR'); // placeholder startowy
  const [ccy, setCcy] = useState('USD');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [data, setData] = useState<Product | null>(null);

  const [addQty, setAddQty] = useState(1);

  // info banner
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // variants (PI v1)
  const [variants, setVariants] = useState<VariantBrief[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsErr, setVariantsErr] = useState<string | null>(null);

  // wyliczenie quick calc
  const unitPrice = useMemo(() => pickUnitPrice(data?.pricing, addQty, ccy), [data?.pricing, addQty, ccy]);
  const totalPrice = useMemo(() => (unitPrice ? unitPrice * addQty : undefined), [unitPrice, addQty]);

  /** Odczytaj ostatni wynik z localStorage przy starcie */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ti-last-inventory');
      if (raw) {
        const last = JSON.parse(raw);
        if (last?.pn) setPn(last.pn);
        if (last?.ccy) setCcy(last.ccy);
        if (last?.data) setData(last.data);
      }
    } catch {}
  }, []);

  /** ===== Load variants by GPN (PI v1) – z sessionStorage cache ===== */
// 30 minut TTL dla cache PI
const PI_CACHE_TTL_MS = 30 * 60 * 1000;

async function loadVariantsByGpn(gpn: string, force = false) {
  const key = `pi-gpn:${gpn.toUpperCase()}`;
  setVariantsErr(null);

  // czyść listę na start, aby UI nie pokazywał starych danych
  setVariants([]);

  // 1) PRÓBA ODCZYTU Z CACHE (tylko jeśli NIE wymuszono)
  if (!force) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const cached = JSON.parse(raw);
        const age = Date.now() - (cached.at ?? 0);
        const list = Array.isArray(cached.data) ? cached.data : [];
        // używamy cache tylko jeśli są jakieś pozycje i nie jest przeterminowany
        if (list.length > 0 && age < PI_CACHE_TTL_MS) {
          setVariants(list);
          setInfoMsg(`Warianty (OPN) dla „${gpn}” z pamięci: ${list.length} pozycji (cache < 30 min).`);
          return;
        }
      }
    } catch { /* ignore */ }
  }

  // 2) FRESH FETCH
  setVariantsLoading(true);
  try {
    const r = await fetch(`/api/ti-products/search?gpn=${encodeURIComponent(gpn)}&page=1&size=50`, { cache: 'no-store' });
    const j = await r.json();

    if (!r.ok || !j?.ok) {
      const msg =
        j?.error ? (typeof j.error === 'string' ? j.error : JSON.stringify(j.error)) : `PI search failed (${r.status})`;
      setVariantsErr(msg);
      return;
    }

    const list = Array.isArray(j?.data?.items) ? j.data.items : [];
    setVariants(list);
    setInfoMsg(`Warianty (OPN) dla „${gpn}”: ${list.length} pozycji.`);

    // zapisuj do cache tylko kiedy MAMY wyniki
    if (list.length > 0) {
      try {
        sessionStorage.setItem(key, JSON.stringify({ data: list, at: Date.now() }));
      } catch { /* ignore */ }
    } else {
      // jeśli pusto, wyczyść ewentualną starą zawartość
      sessionStorage.removeItem(key);
    }
  } catch (e: any) {
    setVariantsErr(e?.message ?? 'PI search failed');
  } finally {
    setVariantsLoading(false);
  }
}

  /** ===== Fetch OPN lub fallback GPN ===== */
  async function fetchPart(e?: React.FormEvent) {
    e?.preventDefault();
    const input = pn.trim();
    if (!input) return;

    setLoading(true);
    setErr(null);
    setInfoMsg(null);
    setData(null);
    setVariants([]);
    setVariantsErr(null);

    try {
      const res = await fetch(`/api/ti-inventory/part?pn=${encodeURIComponent(input)}&ccy=${ccy}`);
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok || !json?.ok) {
        const payload = json?.error ?? json ?? {};
      if (isGpnNotFoundErrorPayload(payload)) {
        // użytkownik wpisał GPN – przełącz na listę wariantów i WYMUSZ świeży fetch
        // oraz usuń ewentualny stary cache
        try { sessionStorage.removeItem(`pi-gpn:${input.toUpperCase()}`); } catch {}
        await loadVariantsByGpn(input, true);
        setInfoMsg(`Wpisano GPN („${input}”). Poniżej warianty (OPN) – kliknij „Load”, aby pobrać ceny i dostępność.`);
        return;
      }

        throw new Error(
          json?.error ? (typeof json.error === 'string' ? json.error : JSON.stringify(json.error)) : text || `HTTP ${res.status}`
        );
      }

      // OPN – powodzenie
      const prod = json.data as Product;
      setData(prod);
      setAddQty(1);

      try {
        localStorage.setItem('ti-last-inventory', JSON.stringify({ pn: input, ccy, data: prod }));
      } catch {}
    } catch (e: any) {
      setErr(e?.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  /** ===== Reset wyszukiwarki ===== */
  function resetSearch() {
    setPn('');
    setData(null);
    setErr(null);
    setInfoMsg(null);
    setVariants([]);
    setVariantsErr(null);
  }

  /** ====== JSX ====== */
  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header + reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Inventory &amp; Pricing</h1>
        <button
          onClick={resetSearch}
          title="Reset"
          style={{
            border: '1px solid #1f2937',
            background: '#0b0f17',
            color: '#9ca3af',
            borderRadius: 999,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
        >
          ⟳
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={fetchPart} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={pn}
          onChange={(e) => setPn(e.target.value)}
          placeholder="TI part number (OPN) lub GPN, np. SN74HC00N albo SN74HC00"
          style={{
            flex: 1,
            background: '#0a0e15',
            border: '1px solid #1f2937',
            borderRadius: 10,
            color: 'white',
            padding: '10px 12px',
            outline: 'none',
          }}
        />
        <select
          value={ccy}
          onChange={(e) => setCcy(e.target.value)}
          style={{
            minWidth: 90,
            background: '#0a0e15',
            border: '1px solid #1f2937',
            borderRadius: 10,
            color: 'white',
            padding: '10px 12px',
          }}
        >
          <option>USD</option>
          <option>EUR</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#111827',
            border: '1px solid #374151',
            color: 'white',
            borderRadius: 10,
            padding: '10px 14px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Info banner (np. przy GPN fallback) */}
      {infoMsg && (
        <div
          style={{
            border: '1px solid #1e3a8a',
            background: '#0b1220',
            color: '#bfdbfe',
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          {infoMsg}
        </div>
      )}

      {/* Error */}
      {err && (
        <div
          style={{
            border: '1px solid #7f1d1d',
            background: '#180f10',
            color: '#fecaca',
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            whiteSpace: 'pre-wrap',
          }}
        >
          Error: {err}
        </div>
      )}

      {/* Karta produktu */}
      {data && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>{data.tiPartNumber}</h2>
            {data.genericPartNumber && <span style={badge}>{data.genericPartNumber}</span>}
            {data.lifeCycle && <span style={{ ...badge, color: '#34d399' }}>{data.lifeCycle}</span>}
          </div>

          {data.description && <div style={{ opacity: 0.9, marginBottom: 12 }}>{data.description}</div>}

          {/* Badges: dostępność / MOQ / SPQ */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={badge}>
              <strong>Available:</strong> {data.quantity ?? '—'}
            </span>
            {data.minimumOrderQuantity != null && (
              <span style={badge}>
                <strong>MOQ:</strong> {data.minimumOrderQuantity}
              </span>
            )}
            {data.standardPackQuantity != null && (
              <span style={badge}>
                <strong>SPQ:</strong> {data.standardPackQuantity}
              </span>
            )}
          </div>

          {/* Pola opisowe */}
          <div style={{ ...row, marginBottom: 12 }}>
            <div style={field}>
              <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>Package type</div>
              <div>{data.packageType || '—'}</div>
            </div>
            <div style={field}>
              <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>Carrier</div>
              <div>{data.packageCarrier || '—'}</div>
            </div>
            <div style={field}>
              <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>Pin count</div>
              <div>{data.pinCount ?? '—'}</div>
            </div>
            <div style={field}>
              <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>ECCN</div>
              <div>{data.exportControlClassificationNumber || '—'}</div>
            </div>
            <div style={field}>
              <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>HTS code</div>
              <div>{data.htsCode || '—'}</div>
            </div>
            <div style={field}>
              <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>Custom reel</div>
              <div>{data.customReel ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Buy now */}
          {data.buyNowUrl && (
            <div style={{ ...field, marginBottom: 12 }}>
              <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>Buy now</div>
              <a href={data.buyNowUrl} target="_blank" rel="noreferrer">
                ti.com product page ↗
              </a>
            </div>
          )}

          {/* Pricing + quick calc + add to order */}
          <div style={{ ...card, background: '#0a0e15' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Pricing</h3>
              <span style={badge}>{ccy}</span>
            </div>

            {/* Tabela progów */}
            <div
              style={{
                marginTop: 10,
                border: '1px solid #1f2937',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  background: '#0b0f17',
                  padding: '8px 10px',
                  fontWeight: 600,
                }}
              >
                <div>From qty</div>
                <div>Unit price</div>
              </div>
              <div>
                {(data.pricing?.find((p) => p.currency === ccy) ?? data.pricing?.[0])?.priceBreaks?.map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr',
                      padding: '8px 10px',
                      borderTop: '1px solid #111827',
                    }}
                  >
                    <div>{b.priceBreakQuantity}</div>
                    <div>{fmt(b.price, ccy)}</div>
                  </div>
                )) || <div style={{ padding: 10, opacity: 0.7 }}>No pricing.</div>}
              </div>
            </div>

            {/* Quick calc + Add to Order */}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Qty:</span>
                <input
                  type="number"
                  min={1}
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  style={{
                    width: 90,
                    background: '#0a0e15',
                    border: '1px solid #1f2937',
                    borderRadius: 8,
                    color: 'white',
                    padding: '6px 8px',
                  }}
                />
              </div>
              <div style={{ opacity: 0.9 }}>
                Unit: <strong>{unitPrice != null ? fmt(unitPrice, ccy) : '—'}</strong>
              </div>
              <div style={{ opacity: 0.9 }}>
                Total: <strong>{totalPrice != null ? fmt(totalPrice, ccy) : '—'}</strong>
              </div>
              <button
                onClick={() => {
                  if (!data) return;
                  addToCart({
                    tiPartNumber: data.tiPartNumber,
                    quantity: addQty,
                    unitPrice: unitPrice,
                    currency: ccy,
                  });
                  setInfoMsg(`Dodano do koszyka: ${data.tiPartNumber} × ${addQty}. Koszyk zapamiętany w tej sesji.`);
                }}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 12px',
                  border: '1px solid #374151',
                  borderRadius: 10,
                  background: '#111827',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Add to Order
              </button>
            </div>
          </div>

          {/* Ręczne dociąganie wariantów po GPN */}
          {data.genericPartNumber && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => loadVariantsByGpn(data.genericPartNumber!)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #374151',
                  background: '#0b0f17',
                  color: 'white',
                }}
                title={`Load variants (OPN) for ${data.genericPartNumber}`}
              >
                Load variants for {data.genericPartNumber}
              </button>
            </div>
          )}
        </div>
      )}

     {/* Variants (generic) */}
{(variantsLoading || variantsErr || variants.length > 0) && (
  <div style={{ ...card }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h3 style={{ marginTop: 0 }}>Variants (generic)</h3>
      {/* narzędzia: Reload + Clear cache */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            const g = (data?.genericPartNumber || pn).trim();
            if (!g) return;
            try { sessionStorage.removeItem(`pi-gpn:${g.toUpperCase()}`); } catch {}
            loadVariantsByGpn(g, true); // FORCE
          }}
          style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #374151', background: '#0b0f17', color: 'white' }}
          title="Force reload variants (ignore cache)"
        >
          Reload
        </button>
        <button
          onClick={() => {
            const g = (data?.genericPartNumber || pn).trim();
            if (!g) return;
            try { sessionStorage.removeItem(`pi-gpn:${g.toUpperCase()}`); } catch {}
            setVariants([]);
            setInfoMsg(`Cache wariantów dla „${g}” wyczyszczony.`);
          }}
          style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #374151', background: '#0b0f17', color: '#93c5fd' }}
          title="Clear variants cache"
        >
          Clear cache
        </button>
      </div>
    </div>

    {variantsLoading && <div>Loading variants…</div>}
    {variantsErr && <div style={{ color: '#fca5a5' }}>Variants error: {variantsErr}</div>}
    {!variantsLoading && !variantsErr && variants.length === 0 && (
      <div style={{ opacity: 0.75 }}>No variants found.</div>
    )}
    {variants.length > 0 && (
      <div style={{ fontSize: 14 }}>
        {variants.map((v, i) => (
          <div
            key={`${v.tiPartNumber}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 8px',
              borderBottom: '1px solid #1f2937',
            }}
          >
            <div
              style={{
                minWidth: 180,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {v.tiPartNumber}
            </div>
            <div style={{ flex: 1, opacity: 0.85 }}>{v.description || '—'}</div>
            <button
              onClick={async () => {
                setPn(v.tiPartNumber);
                await fetchPart(); // pobierz ceny/dostępność dla wybranego OPN
              }}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid #374151',
                background: '#0b0f17',
                color: 'white',
              }}
              title="Fetch price & availability for this OPN"
            >
              Load
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}

</div>
);
}
