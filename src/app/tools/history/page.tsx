'use client';

import { useEffect, useState } from 'react';

/** ==== Minimalne typy – elastyczne (dopasują się do Twojej odpowiedzi) ==== */
type OrderLine = {
  tiPartNumber?: string;
  quantity?: number;
  unitPrice?: number;
  netPrice?: number;
  status?: string;
};

type OrderInfo = {
  orderNumber?: string;
  orderDate?: string;
  currencyCode?: string;
  orderStatus?: string;
  totalOrderSummary?: {
    orderTotal?: number;
    subTotal?: number;
    estimatedTaxes?: number;
    estimatedShippingCost?: number;
  };
  lineItems?: OrderLine[];
};

type OrderSummary = {
  orderInfo?: OrderInfo;
};

type AsnData = any;
type DocsList = any;

/** ==== Małe helpery UI ==== */
const card: React.CSSProperties = {
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 12,
  background: '#0b0f17',
};

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #111827' };
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = { padding: '8px 10px' };
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };

function Field({ label, value }: { label: string; value?: any }) {
  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0a0e15' }}>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value ?? '—'}</div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value?: any }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        padding: '4px 8px',
        border: '1px solid #1f2937',
        borderRadius: 999,
        background: '#0a0e15',
      }}
    >
      <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value ?? '—'}</span>
    </span>
  );
}

/** ==== Strona ==== */
export default function HistoryPage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [asn, setAsn] = useState<AsnData | null>(null);
  const [docs, setDocs] = useState<DocsList | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isTest = process.env.NEXT_PUBLIC_TI_ORDER_MODE === 'test';

  async function loadAll() {
    if (!orderId.trim()) return;
    setLoading(true);
    setErr(null);
    setOrder(null);
    setAsn(null);
    setDocs(null);

    const id = orderId.trim();

    try {
      // 1) Order retrieve – używamy istniejącego API z Twojej aplikacji
      const r1 = await fetch(`/api/ti-order/${encodeURIComponent(id)}`);
      const j1 = await r1.json();
      if (!r1.ok || !j1?.ok) throw new Error(j1?.error ? JSON.stringify(j1.error) : 'Order retrieve failed');
      const summary: OrderSummary = j1.result ?? j1.data ?? j1;
      setOrder(summary);

      // 2) ASN
      const r2 = await fetch(`/api/ti-order/${encodeURIComponent(id)}/asn`);
      const j2 = await r2.json();
      if (r2.ok && j2?.ok) setAsn(j2.data);

      // 3) Financial docs – lista
      const r3 = await fetch(`/api/ti-order/${encodeURIComponent(id)}/documents`);
      const j3 = await r3.json();
      if (r3.ok && j3?.ok) setDocs(j3.data);

      // zapisz do "recent"
      try {
        const raw = localStorage.getItem('ti-orders-recent');
        const arr: string[] = raw ? JSON.parse(raw) : [];
        if (!arr.includes(id)) {
          arr.unshift(id);
          localStorage.setItem('ti-orders-recent', JSON.stringify(arr.slice(0, 20)));
        }
      } catch {}
    } catch (e: any) {
      setErr(e?.message ?? 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  // mini „Recent”
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ti-orders-recent');
      setRecent(raw ? JSON.parse(raw) : []);
    } catch {}
  }, []);

  const info = order?.orderInfo;
  const total = info?.totalOrderSummary?.orderTotal; // <- poprawna nazwa pola

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Order history</h1>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order number (np. T05980912)"
          style={{
            flex: 1,
            border: '1px solid #1f2937',
            borderRadius: 10,
            background: '#0b0f17',
            color: 'white',
            padding: '10px 12px',
          }}
        />
        <button
          onClick={loadAll}
          disabled={loading}
          style={{ border: '1px solid #374151', borderRadius: 10, background: '#111827', color: 'white', padding: '10px 14px' }}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 12, opacity: 0.9 }}>
          <div style={{ marginBottom: 6, fontSize: 13, color: '#9ca3af' }}>Recent:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recent.map((id) => (
              <button
                key={id}
                onClick={() => setOrderId(id)}
                style={{ border: '1px solid #1f2937', borderRadius: 8, background: '#0b0f17', color: 'white', padding: '6px 10px' }}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div style={{ border: '1px solid #7f1d1d', background: '#180f10', color: '#fecaca', borderRadius: 8, padding: 10, marginBottom: 10 }}>
          {err}
        </div>
      )}

      {/* Summary */}
      {info && (
        <div style={{ ...card, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            <Field label="Order number" value={info.orderNumber} />
            <Field label="Date" value={info.orderDate ? new Date(info.orderDate).toLocaleString() : '—'} />
            <Field label="Currency" value={info.currencyCode} />
            <Field label="Status" value={info.orderStatus} />
            <Field label="Total" value={total != null ? `${total} ${info.currencyCode ?? ''}` : '—'} />
          </div>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0' }}>Lines</h4>
            <div style={{ overflow: 'auto', border: '1px solid #1f2937', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0e15' }}>
                    <th style={th}>PN</th>
                    <th style={thRight}>Qty</th>
                    <th style={thRight}>Unit</th>
                    <th style={thRight}>Net</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(info.lineItems ?? []).map((li, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1f2937' }}>
                      <td style={td}>{li.tiPartNumber}</td>
                      <td style={tdRight}>{li.quantity}</td>
                      <td style={tdRight}>{li.unitPrice}</td>
                      <td style={tdRight}>{li.netPrice}</td>
                      <td style={td}>{li.status}</td>
                    </tr>
                  ))}
                  {(!info.lineItems || info.lineItems.length === 0) && (
                    <tr>
                      <td style={td} colSpan={5}>
                        &nbsp;No lines.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Shipments (ASN) */}
      {asn && (
        <div style={{ ...card, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Shipments (ASN)</h3>
          {Array.isArray(asn?.shipments) && asn.shipments.length > 0 ? (
            asn.shipments.map((s: any, idx: number) => (
              <div key={idx} style={{ borderTop: idx ? '1px solid #1f2937' : 'none', paddingTop: idx ? 8 : 0, marginTop: idx ? 8 : 0 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Badge label="Carrier" value={s?.carrier || s?.leg1Carrier || '—'} />
                  <Badge label="Service" value={s?.serviceLevel || '—'} />
                  <Badge label="Ship date" value={s?.shipDate ? new Date(s.shipDate).toLocaleDateString() : '—'} />
                </div>
                <div style={{ marginTop: 6 }}>
                  {Array.isArray(s?.trackingNumbers) && s.trackingNumbers.length > 0 ? (
                    s.trackingNumbers.map((t: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                        <span>Tracking:</span>
                        <code>{t?.masterTracking || t?.leg1Tracking || t?.leg2Tracking || '—'}</code>
                        {t?.leg1TrackingURL && (
                          <a href={t.leg1TrackingURL} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
                            Track ↗
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.8 }}>No tracking data.</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div>No shipments.</div>
          )}
        </div>
      )}

      {/* Documents */}
      {docs && (
        <div style={{ ...card }}>
          <h3 style={{ marginTop: 0 }}>Financial documents</h3>

          {isTest && (
            <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 8 }}>
              Test mode: TI wymaga stałego <code>financialDocumentNumber = 5999999999</code> do pobierania PDF.
            </div>
          )}

          {Array.isArray(docs?.documents) && docs.documents.length > 0 ? (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0e15' }}>
                    <th style={th}>Type</th>
                    <th style={th}>Number</th>
                    <th style={th}>Date</th>
                    <th style={thRight}>Amount</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.documents.map((d: any, i: number) => {
                    const displayNumber = d?.documentNumber || d?.invoiceNumber || d?.id || '—';
                    const calculatedDocId =
                      process.env.NEXT_PUBLIC_TI_ORDER_MODE === 'test' ? '5999999999' : d?.id || d?.documentNumber || d?.invoiceNumber;
                    return (
                      <tr key={i} style={{ borderTop: '1px solid #1f2937' }}>
                        <td style={td}>{d?.type || '—'}</td>
                        <td style={td}>{displayNumber}</td>
                        <td style={td}>{d?.date ? new Date(d.date).toLocaleDateString() : '—'}</td>
                        <td style={tdRight}>{d?.amount ?? '—'}</td>
                        <td style={td}>
                          {calculatedDocId ? (
                            <a
                              href={`/api/ti-order/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(calculatedDocId)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#93c5fd' }}
                            >
                              PDF ↗
                            </a>
                          ) : (
                            <span style={{ opacity: 0.7 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div>No documents.</div>
          )}
        </div>
      )}
    </div>
  );
}
