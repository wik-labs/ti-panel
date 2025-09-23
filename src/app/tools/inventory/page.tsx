'use client';

import { useState } from 'react';

export default function InventoryTool() {
  const [part, setPart] = useState('SN74HC00N');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchPart() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const url = `${process.env.NEXT_PUBLIC_TI_STORE_BASE ?? 'https://transact.ti.com'}/v2/store/products/${encodeURIComponent(part)}?currency=USD`;
      const res = await fetch('/api/ti-generic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method: 'GET' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(JSON.stringify(data.error ?? data));
      }
      setResult(data.data);
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Inventory & Pricing – test</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Part number..."
          value={part}
          onChange={(e) => setPart(e.target.value)}
        />
        <button
          onClick={fetchPart}
          disabled={loading || !part.trim()}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Fetch'}
        </button>
      </div>

      {error && <pre className="text-red-600 whitespace-pre-wrap break-all mb-4">{error}</pre>}
      {result && (
        <details open className="border rounded p-3">
          <summary className="cursor-pointer font-medium mb-2">Response JSON</summary>
          <pre className="overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}
