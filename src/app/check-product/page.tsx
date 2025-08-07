'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CheckProductPage() {
  const searchParams = useSearchParams();
  const paramPart = searchParams.get('part') || '';

  const [query, setQuery] = useState(paramPart);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkProduct = async (partNumber?: string) => {
    const toQuery = partNumber ?? query;
    if (!toQuery) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch('/api/ti-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: toQuery }),
    });

    if (res.status === 404) {
      setError('Product not found');
    } else if (!res.ok) {
      setError('Server error, try again later');
    } else {
      const data = await res.json();
      setResult(data);
    }

    setLoading(false);
  };

  // Gdy jest ?part= w URL, wywołaj raz po mount
  useEffect(() => {
    if (paramPart) {
      checkProduct(paramPart);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramPart]);

  return (
    <main style={{ padding: '1rem' }}>
      <h1>Check TI Product</h1>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Enter product ID"
      />
      <button onClick={() => checkProduct()} disabled={loading}>
        {loading ? 'Checking...' : 'Check'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <pre style={{ background: '#f0f0f0', padding: '1rem' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}

