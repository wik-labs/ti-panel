'use client';
import { useState } from 'react';

export default function InventoryPage() {
  const [pn, setPn] = useState('');
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!pn) return;
    setLoading(true); setError(null); setData(null);
    const res = await fetch('/api/ti-inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partNumber: pn }),
    });

    if (res.status === 429) {
      setError('Rate limit exceeded. Please wait and try again.');
    } else if (!res.ok) {
      setError(`Error ${res.status}`);
    } else {
      setData(await res.json());
    }
    setLoading(false);
  };

  return (
    <main style={{ padding: 16 }}>
      <h1>Inventory & Pricing</h1>
      <input
        value={pn}
        onChange={e => setPn(e.target.value)}
        placeholder="TI Part Number"
      />
      <button onClick={run} disabled={loading} style={{ marginLeft: 8 }}>
        {loading ? 'Loading…' : 'Fetch'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {data && (
        <pre style={{ background: '#111', color: '#eee', padding: 12 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}

