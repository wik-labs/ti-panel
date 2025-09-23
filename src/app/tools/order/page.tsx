'use client';

import { useEffect, useMemo, useState } from 'react';

/** ─── Types (luźne – API TI bywa różne zależnie od konta) ─── */
type Profile = {
  checkoutProfileId: string;
  checkoutProfileName?: string;
  shippingAddressName?: string;
  billingAddressName?: string;
};

type CreateResp = {
  ok: boolean;
  result?: any;
  error?: any;
  meta?: { endpoint?: string };
};

type HistoryItem = {
  orderNumber: string;
  date: string;
  total?: number;
  currency?: string;
};

/** ─── Helpers ─── */
const MODE =
  process.env.NEXT_PUBLIC_TI_ORDER_MODE ??
  process.env.TI_ORDER_MODE ??
  'test';

function currencyFmt(n?: number, ccy = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: ccy || 'USD',
      maximumFractionDigits: 2,
    }).format(n ?? 0);
  } catch {
    return `${n?.toFixed?.(2) ?? n} ${ccy || ''}`.trim();
  }
}

function safeParse(s?: string) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

/** ─── UI atoms ─── */
function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: 'green'|'red'|'zinc'|'amber'|'blue' }) {
  const map: Record<string, string> = {
    green: 'bg-green-100 text-green-800 ring-green-200',
    red: 'bg-red-100 text-red-800 ring-red-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    blue: 'bg-blue-100 text-blue-800 ring-blue-200',
    zinc: 'bg-zinc-100 text-zinc-800 ring-zinc-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${map[tone]}`}>
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border p-4 shadow-sm bg-white/5">{children}</div>;
}

function Pretty({ json }: { json: any }) {
  return <pre className="overflow-auto text-sm">{JSON.stringify(json, null, 2)}</pre>;
}

/** ─── Page ─── */
export default function OrderTool() {
  /** state: profiles */
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileId, setProfileId] = useState('');

  /** state: form */
  const [po, setPo] = useState<string>(`TEST-PO-${Date.now()}`);
  const [comment, setComment] = useState<string>('dev test run');
  const [expedite, setExpedite] = useState(false);

  /** state: lines */
  const [part, setPart] = useState('SN74HC00N');
  const [qty, setQty] = useState(1);
  type CartLine = {
  tiPartNumber: string;
  quantity: number;
  price?: number;         // cena jednostkowa (z TI)
  currency?: string;
  onHandQty?: number;     // dostępne sztuki
  leadTimeWeeks?: number; // lead time
};

const [lines, setLines] = useState<CartLine[]>([]);

  const [partCheck, setPartCheck] = useState<{ ok: boolean; msg?: string } | null>(null);
  const canAdd = useMemo(() => !!part.trim() && qty > 0 && (partCheck?.ok ?? false), [part, qty, partCheck]);

  /** state: actions */
  const [submitting, setSubmitting] = useState(false);
  const [createResp, setCreateResp] = useState<CreateResp | null>(null);
  const [retrieveData, setRetrieveData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /** state: history */
  const [history, setHistory] = useState<HistoryItem[]>([]);

  /** load profiles */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ti-checkout/profiles');
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(JSON.stringify(json.error ?? json));
        setProfiles(json.data ?? []);
        if ((json.data?.length ?? 0) > 0) setProfileId(json.data[0].checkoutProfileId);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load profiles');
      } finally {
        setLoadingProfiles(false);
      }
    })();
  }, []);

  /** load history */
  useEffect(() => {
    const raw = localStorage.getItem('ti-panel:lastOrders');
    if (raw) {
      const arr = safeParse(raw) as HistoryItem[] | null;
      if (Array.isArray(arr)) setHistory(arr);
    }
  }, []);

  /** validate part number on change (debounced) */
  useEffect(() => {
    if (!part.trim()) { setPartCheck(null); return; }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        // walidujemy po prostu istnienie części (200) – bez ceny
        const url = `${process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com'}/v2/store/products/${encodeURIComponent(part.trim())}?currency=USD`;
        const res = await fetch('/api/ti-generic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, method: 'GET' }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error('not ok');
        setPartCheck({ ok: true });
      } catch {
        setPartCheck({ ok: false, msg: 'Part not found / unavailable' });
      }
    }, 450);
    return () => { clearTimeout(t); controller.abort(); };
  }, [part]);

  /** helpers */
   function pickPriceForQty(priceBreaks: any[] | undefined, qty: number): number | undefined {
    if (!Array.isArray(priceBreaks) || !qty) return undefined;
    // wybierz najwyższy próg, który nie przekracza qty
    const sorted = [...priceBreaks].sort((a, b) => (a.priceBreakQuantity ?? 0) - (b.priceBreakQuantity ?? 0));
    let price: number | undefined;
    for (const br of sorted) {
      if (qty >= (br.priceBreakQuantity ?? 0)) price = br.price;
      else break;
    }
    return price;
  }

  async function enrichLine(pn: string, qty: number): Promise<Partial<CartLine>> {
    const res = await fetch(`/api/ti-inventory/part?pn=${encodeURIComponent(pn)}&ccy=USD`);
    const json = await res.json();
    if (!res.ok || !json.ok) return {};

    const d = json.data;
    const tier = Array.isArray(d?.pricing) ? d.pricing[0] : undefined;
    const currency = tier?.currency ?? 'USD';
    const price = pickPriceForQty(tier?.priceBreaks, qty);

    const onHand = d?.quantity;           // ← z Twojego payloadu
    const lead   = undefined;             // brak w tej odpowiedzi – zostawiamy "—"

    return { price, currency, onHandQty: onHand, leadTimeWeeks: lead };
  }



    async function addLine() {
      if (!canAdd) return;
      const base: CartLine = { tiPartNumber: part.trim(), quantity: qty };
      const extra = await enrichLine(base.tiPartNumber, base.quantity);
      setLines(prev => [...prev, { ...base, ...extra }]);
      setPart(''); setQty(1); setPartCheck(null);
    }

    async function updateLineQty(i: number, newQty: number) {
    setLines(prev => {
      const next = [...prev];
      next[i] = { ...next[i], quantity: newQty };
      return next;
    });
    // przelicz cenę wg progów dla nowej ilości
    const l = lines[i];
    const extra = await enrichLine(l.tiPartNumber, newQty);
    setLines(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...extra };
      return next;
    });
  }



  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSubmit = useMemo(() => profileId && lines.length > 0 && po.trim().length > 0, [profileId, lines, po]);

  /** actions */
  async function createOrder() {
    setSubmitting(true);
    setCreateResp(null);
    setRetrieveData(null);
    setError(null);
    try {
      const body = {
        order: {
          checkoutProfileId: profileId,
          customerPurchaseOrderNumber: po.trim(),
          purchaseOrderDate: new Date().toISOString(),
          expediteShipping: expedite,
          customerOrderComments: comment ? [{ message: comment }] : [],
          lineItems: lines.map((l, idx) => ({
            customerLineItemNumber: idx + 1,
            tiPartNumber: l.tiPartNumber,
            quantity: l.quantity,
          })),
        },
      };

      const res = await fetch('/api/ti-order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(JSON.stringify(json.error ?? json));
      setCreateResp(json);

      // wpis do historii
      const info = json?.result?.orderInfo ?? {};
      const entry: HistoryItem = {
        orderNumber: info?.orderNumber ?? '—',
        date: info?.orderDate ?? new Date().toISOString(),
        total: info?.totalOrderSummary?.orderTotal,
        currency: info?.currencyCode ?? 'USD',
      };
      const next = [entry, ...history].slice(0, 10);
      setHistory(next);
      localStorage.setItem('ti-panel:lastOrders', JSON.stringify(next));
    } catch (e: any) {
      setCreateResp({ ok: false, error: safeParse(e?.message) ?? e?.message ?? 'Create failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function retrieve(orderOverride?: string) {
    try {
      setError(null);
      setRetrieveData(null);

      const orderNumber =
        orderOverride ||
        createResp?.result?.orderInfo?.orderNumber ||
        createResp?.result?.orderNumber ||
        createResp?.result?.orderId ||
        createResp?.result?.order?.orderNumber;

      if (!orderNumber) {
        setError('Brak orderNumber w odpowiedzi CREATE.');
        return;
      }

      const res = await fetch(`/api/ti-order/${encodeURIComponent(orderNumber)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(JSON.stringify(json.error ?? json));
      setRetrieveData(json);
    } catch (e: any) {
      setError(safeParse(e?.message) ?? e?.message ?? 'Retrieve failed');
    }
  }

  /** derived */
  const orderInfo = createResp?.result?.orderInfo ?? null;
  const orderNo = orderInfo?.orderNumber as string | undefined;
  const ccy = orderInfo?.currencyCode ?? 'USD';
  const totals = orderInfo?.totalOrderSummary ?? {};
  const itemCount = Array.isArray(orderInfo?.lineItems) ? orderInfo.lineItems.length : 0;
  const endpoint = (createResp?.meta?.endpoint as string | undefined) ?? `/v2/store/orders/${MODE === 'live' ? '' : 'test'}`;
  const estSubtotal = lines.reduce((s, l) => s + ((l.price ?? 0) * l.quantity), 0);
  const estCurrency = lines[0]?.currency ?? 'USD';


  return (
    <main className="p-6 max-w-7xl mx-auto text-sm">
      <h1 className="text-2xl font-semibold mb-3">Order</h1>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm">
          Mode: <b>{MODE}</b> — endpoint: <code>{endpoint}</code>
        </div>
        {MODE !== 'live' ? <Badge tone="blue">Safe TEST mode</Badge> : <Badge tone="red">LIVE</Badge>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: form */}
        <div className="space-y-4">
          <Card>
            <div className="grid gap-3">
              <label className="block">
                <span className="block text-xs mb-1">Checkout profile</span>
                <select
                  className="border rounded px-3 py-2 w-full"
                  disabled={loadingProfiles}
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p.checkoutProfileId} value={p.checkoutProfileId}>
                      {p.checkoutProfileName ?? p.checkoutProfileId} — ship:{p.shippingAddressName} / bill:{p.billingAddressName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs mb-1">Customer PO</span>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={po}
                    onChange={(e) => setPo(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="block text-xs mb-1">Comment</span>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="optional"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={expedite} onChange={(e) => setExpedite(e.target.checked)} />
                <span>Expedite shipping</span>
              </label>
            </div>
          </Card>

          <Card>
            <div className="grid md:grid-cols-[1fr,120px,120px] gap-2 items-end">
              <label className="block">
                <span className="block text-xs mb-1">TI part number</span>
                <input
                  className={`border rounded px-3 py-2 w-full ${partCheck ? (partCheck.ok ? 'border-green-400' : 'border-red-400') : ''}`}
                  placeholder="np. SN74HC00N"
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                />
                {partCheck && !partCheck.ok ? (
                  <div className="text-xs text-red-600 mt-1">{partCheck.msg}</div>
                ) : null}
              </label>
              <label className="block">
                <span className="block text-xs mb-1">Qty</span>
                <input
                  type="number"
                  min={1}
                  className="border rounded px-3 py-2 w-full"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value || '1', 10))}
                />
              </label>
              <button
                onClick={addLine}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                disabled={!canAdd}
              >
                Add line
              </button>
            </div>

            <div className="mt-4 rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-50 text-left">
                  <tr>
                    <th className="p-2 w-10">#</th>
                    <th className="p-2">Part</th>
                    <th className="p-2 w-24 text-right">Qty</th>
                    <th className="p-2 w-24 text-right">Avail</th>
                    <th className="p-2 w-24 text-right">Price</th>
                    <th className="p-2 w-28 text-right">Subtotal</th>
                    <th className="p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td className="p-3 text-zinc-500" colSpan={7}>No items</td></tr>
                  ) : (
                    lines.map((l, i) => {
                      const sub = (l.price ?? 0) * l.quantity;
                      const warn = l.onHandQty != null && l.quantity > l.onHandQty;
                      return (
                        <tr key={i} className="border-t">
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2">{l.tiPartNumber}</td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              min={1}
                              className="border rounded px-2 py-1 w-20 text-right"
                              value={l.quantity}
                              onChange={e => {
                                const v = parseInt(e.target.value || '1', 10);
                                updateLineQty(i, Math.max(1, v));
                              }}
                            />
                          </td>
                          <td className={`p-2 text-right ${warn ? 'text-amber-600 font-medium' : ''}`}>
                            {l.onHandQty ?? '—'}
                          </td>
                          <td className="p-2 text-right">
                            {l.price != null ? currencyFmt(l.price, l.currency ?? 'USD') : '—'}
                          </td>
                          <td className="p-2 text-right">
                            {l.price != null ? currencyFmt(sub, l.currency ?? 'USD') : '—'}
                          </td>
                          <td className="p-2 text-right">
                            <button className="text-xs underline" onClick={() => removeLine(i)}>remove</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>



            <div className="mt-3 flex items-center gap-4">
              <div className="text-sm">
                Pre-subtotal: <b>{currencyFmt(estSubtotal, estCurrency)}</b>
              </div>
              <button
                onClick={createOrder}
                disabled={!canSubmit || submitting}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create (TEST)'}
              </button>
              {orderNo && (
                <button onClick={() => retrieve()} className="px-4 py-2 rounded border">
                  Retrieve order
                </button>
              )}
            </div>

          </Card>
        </div>

        {/* RIGHT: summary & history */}
        <div className="space-y-4">
          {error && (
            <Card>
              <div className="text-red-700">{String(error)}</div>
            </Card>
          )}

          {orderNo && (
            <Card>
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">Order #</div>
                <button className="text-xs underline" onClick={() => orderNo && copy(orderNo)}>Copy</button>
              </div>
              <div className="text-xl font-semibold mt-1">{orderNo}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-zinc-400">Status</div>
                  <div className="mt-1"><Badge tone={orderInfo?.orderStatus === 'PROCESSING' ? 'amber' : 'zinc'}>{orderInfo?.orderStatus ?? '—'}</Badge></div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Items</div>
                  <div className="mt-1">{itemCount || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Subtotal (est.)</div>
                  <div className="mt-1">{currencyFmt(totals?.subTotal, ccy)}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Order total (est.)</div>
                  <div className="mt-1">{currencyFmt(totals?.orderTotal, ccy)}</div>
                </div>
              </div>
            </Card>
          )}

          {orderInfo?.lineItems?.length > 0 && (
            <Card>
              <div className="mb-2 font-medium">Items</div>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left">
                    <tr>
                      <th className="p-2 w-10">#</th>
                      <th className="p-2">Part</th>
                      <th className="p-2">Desc</th>
                      <th className="p-2 w-16 text-right">Qty</th>
                      <th className="p-2 w-24 text-right">Unit</th>
                      <th className="p-2 w-24 text-right">Net</th>
                      <th className="p-2 w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderInfo.lineItems.map((li: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{li.customerLineItemNumber ?? i + 1}</td>
                        <td className="p-2">{li.tiPartNumber}</td>
                        <td className="p-2">{li.tiPartDescription}</td>
                        <td className="p-2 text-right">{li.quantity}</td>
                        <td className="p-2 text-right">{currencyFmt(li.unitPrice, ccy)}</td>
                        <td className="p-2 text-right">{currencyFmt(li.netPrice, ccy)}</td>
                        <td className="p-2"><Badge tone={li.status === 'PROCESSING' ? 'amber' : 'zinc'}>{li.status ?? '—'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {createResp && (
            <details className="rounded-2xl border p-3">
              <summary className="cursor-pointer font-medium">Create response (raw JSON)</summary>
              <Pretty json={createResp} />
            </details>
          )}

          {retrieveData && (
            <details className="rounded-2xl border p-3">
              <summary className="cursor-pointer font-medium">Retrieve response</summary>
              <Pretty json={retrieveData} />
            </details>
          )}

          <Card>
            <div className="mb-2 font-medium">History (local)</div>
            {history.length === 0 ? (
              <div className="text-zinc-500">No recent orders.</div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-50 text-left">
                    <tr>
                      <th className="p-2">Order #</th>
                      <th className="p-2">Date</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{h.orderNumber}</td>
                        <td className="p-2">{new Date(h.date).toLocaleString()}</td>
                        <td className="p-2 text-right">{h.total != null ? currencyFmt(h.total, h.currency ?? 'USD') : '—'}</td>
                        <td className="p-2">
                          <button className="text-xs underline" onClick={() => retrieve(h.orderNumber)}>Retrieve</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
