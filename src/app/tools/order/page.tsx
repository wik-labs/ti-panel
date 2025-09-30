'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCart, setCart, clearCart } from '@/lib/cart';

type CartItemBasic = { tiPartNumber: string; quantity: number };

type PriceBreak = { priceBreakQuantity: number; price: number };
type PricingTier = { currency: string; priceBreaks: PriceBreak[] };
type InventoryPart = {
  tiPartNumber: string;
  description?: string;
  quantity?: number; // available to ship
  pricing?: PricingTier[];
  minimumOrderQuantity?: number;
  standardPackQuantity?: number;
};

type CartLine = CartItemBasic & {
  description?: string;
  available?: number;
  unit?: number;
  net?: number;
  currency?: string;
  leadWeeks?: number;
};

type CheckoutProfile = {
  checkoutProfileId: string;
  checkoutProfileName?: string;
  shippingAddressName?: string;
  billingAddressName?: string;
};

type CreateOrderResult = {
  orderInfo?: {
    orderNumber?: string;
    orderStatus?: string;
    orderDate?: string;
    currencyCode?: string;
    orderEntry?: string;
    customerPurchaseOrderNumber?: string;
    checkoutProfileId?: string;
    totalOrderSummary?: {
      subTotal?: number;
      estimatedShippingCost?: number | null;
      estimatedTaxes?: number | null;
      orderTotal?: number;
    };
    lineItems?: Array<{
      tiLineItemNumber?: string;
      customerLineItemNumber?: string;
      tiPartNumber?: string;
      tiPartDescription?: string;
      quantity?: number;
      unitPrice?: number;
      netPrice?: number;
      status?: string;
      packageInformation?: {
        carrier?: string;
        delivery?: Array<{ type?: string; quantity?: number }>;
      };
    }>;
    shippingAddress?: Partial<AddressLike>;
    billingAddress?: Partial<AddressLike>;
  };
  errors?: unknown;
};

type AddressLike = {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  stateRegion?: string | null;
  postalCode?: string;
  regionCode?: string;
  region?: string;
  email?: string;
  phoneNumber?: string;
};

// ───────────────────────────────── helpers ─────────────────────────────────

const mode =
  (process.env.NEXT_PUBLIC_TI_ORDER_MODE ?? process.env.TI_ORDER_MODE ?? 'test')
    .toString()
    .toLowerCase() as 'test' | 'live';

function fmtMoney(v: number | undefined, ccy: string | undefined) {
  if (v == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy ?? 'USD' }).format(v);
  } catch {
    return `${v.toFixed(2)} ${ccy ?? ''}`.trim();
  }
}

function Badge({
  children,
  color = '#111827',
  text = '#e5e7eb',
  title,
}: {
  children: React.ReactNode;
  color?: string;
  text?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        background: color,
        color: text,
        fontSize: 12,
        lineHeight: 1.6,
        border: '1px solid rgba(255,255,255,0.06)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function priceForQty(tier: PricingTier | undefined, qty: number): number | undefined {
  if (!tier?.priceBreaks?.length || qty <= 0) return undefined;
  const sorted = tier.priceBreaks.slice().sort((a, b) => a.priceBreakQuantity - b.priceBreakQuantity);
  let p: number | undefined;
  for (const br of sorted) {
    if (qty >= br.priceBreakQuantity) p = br.price;
    else break;
  }
  return p;
}

async function fetchInventory(pn: string, ccy: string) {
  const r = await fetch(`/api/ti-inventory/part?pn=${encodeURIComponent(pn)}&ccy=${ccy}`);
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(j?.error ?? 'Inventory fetch failed');
  return j.data as InventoryPart;
}

async function enrichLine(pn: string, qty: number, ccy: string): Promise<Partial<CartLine>> {
  const inv = await fetchInventory(pn, ccy);
  const tier = inv.pricing?.[0];
  const unit = priceForQty(tier, qty);
  return {
    description: inv.description,
    available: inv.quantity ?? undefined,
    unit: unit,
    net: unit != null ? unit * qty : undefined,
    currency: tier?.currency ?? ccy,
  };
}

function extractTiErrorMessage(json: any, fallback: string, status?: number) {
  // Obsłuż typowe kształty: { error: [...] } lub { error: "..." } lub plain text
  const err = json?.error ?? json;
  let msgs: string[] = [];

  if (Array.isArray(err)) {
    msgs = err
      .map((e) => e?.message || e?.reason || e?.errorCode)
      .filter(Boolean);
  } else if (typeof err === 'string') {
    msgs = [err];
  } else if (err && typeof err === 'object') {
    // czasem { errors: [...] }
    const arr = Array.isArray(err.errors) ? err.errors : [];
    if (arr.length) {
      msgs = arr
        .map((e: any) => e?.message || e?.reason || e?.errorCode)
        .filter(Boolean);
    } else if (err.message || err.reason) {
      msgs = [err.message || err.reason];
    }
  }

  const prefix =
    status && status >= 500
      ? `TI service issue (HTTP ${status})`
      : status
      ? `TI error (HTTP ${status})`
      : `TI error`;

  if (msgs.length) return `${prefix}: ${msgs.join(' | ')}`;
  return `${prefix}: ${fallback}`;
}

// ───────────────────────────────── page ─────────────────────────────────

export default function OrderPage() {
  // checkout profile
  const [profiles, setProfiles] = useState<CheckoutProfile[]>([]);
  const [profileId, setProfileId] = useState<string>('');

  // form
  const [customerPO, setCustomerPO] = useState<string>('');
  const [comment, setComment] = useState<string>('dev test run');
  const [expedite, setExpedite] = useState<boolean>(false);
  const [currency, setCurrency] = useState<string>('USD');

  // cart / lines
  const [lines, setLines] = useState<CartLine[]>([]);
  const cartSubtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.net ?? 0), 0),
    [lines]
  );
  const canCreate = lines.length > 0 && !!profileId;

  // create / retrieve
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createRes, setCreateRes] = useState<CreateOrderResult | null>(null);
  const [lastOrder, setLastOrder] = useState<string>('');
  const [retrieveBusy, setRetrieveBusy] = useState(false);
  const [retrieveErr, setRetrieveErr] = useState<string | null>(null);
  const [retrieveRes, setRetrieveRes] = useState<CreateOrderResult | null>(null);

  // local history of orders
  const [history, setHistory] = useState<Array<{ order: string; date: string; total?: number }>>([]);

  // load profiles
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/ti-checkout/profiles');
        const j = await r.json();
        if (j?.ok && Array.isArray(j.data)) {
          setProfiles(j.data as CheckoutProfile[]);
          if (!profileId && j.data[0]?.checkoutProfileId) {
            setProfileId(j.data[0].checkoutProfileId);
          }
        }
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load cart and enrich
  useEffect(() => {
    (async () => {
      const baseCart = getCart(); // [{pn, qty}]
      if (!baseCart.length) return;
      const enriched: CartLine[] = [];
      for (const it of baseCart) {
        try {
          const extra = await enrichLine(it.tiPartNumber, it.quantity, currency);
          enriched.push({ ...it, ...extra });
        } catch {
          enriched.push({ ...it }); // minimal fallback
        }
      }
      setLines(enriched);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync cart (persist)
  useEffect(() => {
    const basics: CartItemBasic[] = lines.map(l => ({ tiPartNumber: l.tiPartNumber, quantity: l.quantity }));
    setCart(basics);
  }, [lines]);

  // load local history
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ti-order-history');
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    localStorage.setItem('ti-order-history', JSON.stringify(history));
  }, [history]);

  // add new line manually
  const [newPn, setNewPn] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [addBusy, setAddBusy] = useState(false);
  async function addLine() {
    if (!newPn.trim() || newQty <= 0) return;
    setAddBusy(true);
    try {
      const extra = await enrichLine(newPn.trim(), newQty, currency);
      setLines(prev => [...prev, { tiPartNumber: newPn.trim(), quantity: newQty, ...extra }]);
      setNewPn('');
      setNewQty(1);
    } finally {
      setAddBusy(false);
    }
  }

  // update qty on a line
  async function updateQty(idx: number, qty: number) {
    if (qty <= 0) return;
    const line = lines[idx];
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...line, quantity: qty, net: line.unit != null ? line.unit * qty : undefined };
      return next;
    });
    // re-enrich in background (price tier may change with qty)
    try {
      const extra = await enrichLine(line.tiPartNumber, qty, currency);
      setLines(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...extra, quantity: qty };
        return next;
      });
    } catch { /* ignore */ }
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  async function onCreate() {
  if (!canCreate) return;
  setCreateBusy(true);
  setCreateErr(null);
  setCreateRes(null);
  setRetrieveRes(null);
  try {
    const res = await fetch('/api/ti-order/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId,
        po: customerPO || `TEST-PO-${Date.now()}`,
        comment,
        expedite,
        lines: lines.map(l => ({ tiPartNumber: l.tiPartNumber, quantity: l.quantity })),
        mode, // 'test' | 'live'
      }),
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok || !json?.ok) {
      // zbuduj czytelny komunikat z odpowiedzi TI
      const msg = extractTiErrorMessage(json, text || `HTTP ${res.status}`, json?.status ?? res.status);
      throw new Error(msg);
    }

    setCreateRes(json.result);
    const orderNo = json.result?.orderInfo?.orderNumber ?? '';
    setLastOrder(orderNo);
    setHistory(prev => [{ order: orderNo, date: new Date().toISOString(), total: json.result?.orderInfo?.totalOrderSummary?.orderTotal }, ...prev].slice(0, 20));
    clearCart();
    setLines([]);
  } catch (e: any) {
    setCreateErr(e?.message ?? 'Create failed');
  } finally {
    setCreateBusy(false);
  }
}


  async function onRetrieve(orderId: string) {
    if (!orderId.trim()) return;
    setRetrieveBusy(true);
    setRetrieveErr(null);
    setRetrieveRes(null);
    try {
      const r = await fetch(`/api/ti-order/${encodeURIComponent(orderId.trim())}`);
      const j = (await r.json()) as { ok: boolean; result?: CreateOrderResult; error?: unknown };
      if (!r.ok || !j.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Retrieve failed');
      setRetrieveRes(j.result ?? null);
    } catch (e) {
      setRetrieveErr(e instanceof Error ? e.message : 'Retrieve failed');
    } finally {
      setRetrieveBusy(false);
    }
  }

  const modeColor = mode === 'test' ? '#0b3b1f' : '#3b0b0b';
  const modeText = mode === 'test' ? '#a7f3d0' : '#fecaca';

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '8px 0 6px' }}>Order</h1>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <Badge color={modeColor} text={modeText} title="Order mode">{mode.toUpperCase()}</Badge>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>
          endpoint: {mode === 'test' ? '/v2/store/orders/test' : '/v2/store/orders'}
        </span>
      </div>

      {/* FORM CARD */}
      <section style={card}>
        <h2 style={h2}>Checkout & header</h2>

        <div style={grid2}>
          <div>
            <label className="block" style={label}>Checkout profile</label>
            <select
              value={profileId}
              onChange={e => setProfileId(e.target.value)}
              style={input}
            >
              {profiles.map(p => (
                <option key={p.checkoutProfileId} value={p.checkoutProfileId}>
                  {p.checkoutProfileName ?? p.checkoutProfileId} — ship:{p.shippingAddressName ?? '—'} / bill:{p.billingAddressName ?? '—'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <label style={label}>Customer PO</label>
              <input value={customerPO} onChange={e => setCustomerPO(e.target.value)} style={input}/>
            </div>
            <div>
              <label style={label}>Comment</label>
              <input value={comment} onChange={e => setComment(e.target.value)} style={input}/>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input type="checkbox" checked={expedite} onChange={e => setExpedite(e.target.checked)} />
              <span>Expedite shipping</span>
            </label>
          </div>
        </div>
      </section>

      {/* LINES CARD */}
      <section style={card}>
        <h2 style={h2}>Line items</h2>

        {/* add manual line */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input
            placeholder="TI PN (np. SN74HC00N)"
            value={newPn}
            onChange={e => setNewPn(e.target.value)}
            style={{ ...input, flex: 1 }}
          />
          <input
            type="number"
            min={1}
            value={newQty}
            onChange={e => setNewQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
            style={{ ...input, width: 100, textAlign: 'right' }}
          />
          <button onClick={addLine} disabled={addBusy} style={btn}>
            {addBusy ? 'Adding…' : 'Add line'}
          </button>
        </div>

        {/* table */}
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111', color: '#d4d4d4' }}>
                <th style={th}>#</th>
                <th style={th}>Part</th>
                <th style={th}>Desc</th>
                <th style={thRight}>Avail</th>
                <th style={thRight}>Qty</th>
                <th style={thRight}>Unit</th>
                <th style={thRight}>Net</th>
                <th style={th}> </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 12, color: '#a1a1a1' }}>Cart is empty.</td>
                </tr>
              )}
              {lines.map((l, i) => (
                <tr key={`${l.tiPartNumber}-${i}`} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}><b>{l.tiPartNumber}</b></td>
                  <td style={td}>{l.description ?? '—'}</td>
                  <td style={tdRight}>{l.available != null ? l.available.toLocaleString() : '—'}</td>
                  <td style={tdRight}>
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={e => updateQty(i, Math.max(1, parseInt(e.target.value || '1', 10)))}
                      style={{ ...input, width: 90, textAlign: 'right' }}
                    />
                  </td>
                  <td style={tdRight}>{fmtMoney(l.unit, l.currency)}</td>
                  <td style={tdRight}>{fmtMoney(l.net, l.currency)}</td>
                  <td style={td}>
                    <button onClick={() => removeLine(i)} style={btnGhost}>remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '1px solid #1f2937' }}>
                  <td colSpan={6} style={{ ...tdRight, fontWeight: 700 }}>Subtotal</td>
                  <td style={{ ...tdRight, fontWeight: 700 }}>
                    {fmtMoney(cartSubtotal, lines[0]?.currency ?? 'USD')}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onCreate} disabled={!canCreate || createBusy} style={btnPrimary}>
          {createBusy ? 'Creating…' : `Create (${mode.toUpperCase()})`}
        </button>
        {createErr && (
  <div style={{ marginLeft: 8, flex: 1 }}>
    <ErrorBanner>{createErr}</ErrorBanner>
  </div>
)}

      </div>

      {/* CREATE RESPONSE */}
      {createRes?.orderInfo && (
        <section style={card}>
          <h2 style={h2}>Create response</h2>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14 }}>
              Order #: <b>{createRes.orderInfo.orderNumber ?? '—'}</b>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(createRes.orderInfo?.orderNumber ?? '')}
              style={btnGhost}
            >
              Copy
            </button>
            <Badge color={modeColor} text={modeText}>via {mode === 'test' ? '/v2/store/orders/test' : '/v2/store/orders'}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <CardKV
              title="Status"
              rows={[
                ['Order status', createRes.orderInfo.orderStatus ?? '—'],
                ['Date', createRes.orderInfo.orderDate ? new Date(createRes.orderInfo.orderDate).toLocaleString() : '—'],
                ['PO', createRes.orderInfo.customerPurchaseOrderNumber ?? '—'],
              ]}
            />
            <CardKV
              title="Totals"
              rows={[
                ['Subtotal', fmtMoney(createRes.orderInfo.totalOrderSummary?.subTotal, createRes.orderInfo.currencyCode)],
                ['Shipping (est.)', fmtMoney(createRes.orderInfo.totalOrderSummary?.estimatedShippingCost ?? undefined, createRes.orderInfo.currencyCode)],
                ['Taxes (est.)', fmtMoney(createRes.orderInfo.totalOrderSummary?.estimatedTaxes ?? undefined, createRes.orderInfo.currencyCode)],
                ['Order total', fmtMoney(createRes.orderInfo.totalOrderSummary?.orderTotal, createRes.orderInfo.currencyCode)],
              ]}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <h3 style={h3}>Items</h3>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#111', color: '#d4d4d4' }}>
                    <th style={th}>#</th>
                    <th style={th}>Part</th>
                    <th style={th}>Desc</th>
                    <th style={thRight}>Qty</th>
                    <th style={thRight}>Unit</th>
                    <th style={thRight}>Net</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(createRes.orderInfo.lineItems ?? []).map((li, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1f2937' }}>
                      <td style={td}>{i + 1}</td>
                      <td style={td}><b>{li.tiPartNumber}</b></td>
                      <td style={td}>{li.tiPartDescription ?? '—'}</td>
                      <td style={tdRight}>{li.quantity ?? '—'}</td>
                      <td style={tdRight}>{fmtMoney(li.unitPrice, createRes.orderInfo?.currencyCode)}</td>
                      <td style={tdRight}>{fmtMoney(li.netPrice, createRes.orderInfo?.currencyCode)}</td>
                      <td style={td}>{li.status ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* RETRIEVE */}
      <section style={card}>
        <h2 style={h2}>Retrieve</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            placeholder="Order number (e.g. T05979925)"
            value={lastOrder}
            onChange={e => setLastOrder(e.target.value)}
            style={{ ...input, width: 260 }}
          />
          <button onClick={() => onRetrieve(lastOrder)} disabled={retrieveBusy} style={btn}>
            {retrieveBusy ? 'Retrieving…' : 'Retrieve order'}
          </button>
          {retrieveErr && <span style={{ color: '#ef4444', fontSize: 13 }}>Error: {retrieveErr}</span>}
        </div>

        {retrieveRes?.orderInfo && (
          <div style={{ marginTop: 8 }}>
            <CardKV
              title={`Order ${retrieveRes.orderInfo.orderNumber ?? ''}`}
              rows={[
                ['Status', retrieveRes.orderInfo.orderStatus ?? '—'],
                ['Date', retrieveRes.orderInfo.orderDate ? new Date(retrieveRes.orderInfo.orderDate).toLocaleString() : '—'],
                ['Currency', retrieveRes.orderInfo.currencyCode ?? '—'],
                ['Total', fmtMoney(retrieveRes.orderInfo.totalOrderSummary?.orderTotal, retrieveRes.orderInfo.currencyCode)],
              ]}
            />

            <div style={{ marginTop: 10 }}>
              <h3 style={h3}>Items</h3>
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#111', color: '#d4d4d4' }}>
                      <th style={th}>#</th>
                      <th style={th}>Part</th>
                      <th style={th}>Desc</th>
                      <th style={thRight}>Qty</th>
                      <th style={thRight}>Unit</th>
                      <th style={thRight}>Net</th>
                      <th style={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(retrieveRes.orderInfo.lineItems ?? []).map((li, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #1f2937' }}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}><b>{li.tiPartNumber}</b></td>
                        <td style={td}>{li.tiPartDescription ?? '—'}</td>
                        <td style={tdRight}>{li.quantity ?? '—'}</td>
                        <td style={tdRight}>{fmtMoney(li.unitPrice, retrieveRes.orderInfo?.currencyCode)}</td>
                        <td style={tdRight}>{fmtMoney(li.netPrice, retrieveRes.orderInfo?.currencyCode)}</td>
                        <td style={td}>{li.status ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* HISTORY */}
      {history.length > 0 && (
        <section style={card}>
          <h2 style={h2}>History (local)</h2>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111', color: '#d4d4d4' }}>
                  <th style={th}>Order #</th>
                  <th style={th}>Date</th>
                  <th style={thRight}>Total</th>
                  <th style={th}> </th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #1f2937' }}>
                    <td style={td}>{h.order}</td>
                    <td style={td}>{new Date(h.date).toLocaleString()}</td>
                    <td style={tdRight}>{h.total != null ? h.total.toFixed(2) : '—'}</td>
                    <td style={td}>
                      <button onClick={() => { setLastOrder(h.order); onRetrieve(h.order); }} style={btnGhost}>Retrieve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────── UI bits ───────────────────────────────

function CardKV({ title, rows }: { title: string; rows: Array<[string, React.ReactNode]> }) {
  return (
    <div style={{ border: '1px solid #222', borderRadius: 12, background: '#0f0f0f', padding: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>{k}</div>
            <div style={{ fontSize: 13 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid #7f1d1d',
      background: '#1f0b0b',
      color: '#fecaca',
      padding: '8px 10px',
      borderRadius: 8,
      fontSize: 13,
    }}>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  border: '1px solid #222',
  borderRadius: 16,
  background: '#0b0b0b',
  padding: 16,
  marginBottom: 12,
};

const h2: React.CSSProperties = { margin: '0 0 10px', fontSize: 18, fontWeight: 700 };
const h3: React.CSSProperties = { margin: '0 0 6px', fontSize: 15, fontWeight: 700 };

const label: React.CSSProperties = { display: 'block', marginBottom: 6, fontSize: 12, color: '#9ca3af' };
const input: React.CSSProperties = {
  border: '1px solid #222',
  borderRadius: 10,
  background: '#0f0f0f',
  color: '#eaeaea',
  padding: '8px 10px',
};
const btn: React.CSSProperties = {
  border: '1px solid #222',
  borderRadius: 8,
  background: '#111',
  color: '#eaeaea',
  padding: '8px 12px',
  cursor: 'pointer',
};
const btnPrimary: React.CSSProperties = { ...btn, background: '#1a1a1a', fontWeight: 700 };
const btnGhost: React.CSSProperties = { ...btn, background: '#0b0b0b' };

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontWeight: 600,
  fontSize: 12,
  borderBottom: '1px solid #1f2937',
  whiteSpace: 'nowrap',
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' as const };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 13, verticalAlign: 'top' };
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' as const };

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};
