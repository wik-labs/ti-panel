'use client';

import { useState } from 'react';

export default function CheckProductPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const checkProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ti-query', {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: Record<string, unknown> = await res.json();
      setResult(data);
    } catch {
      console.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Check TI Product</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter product ID"
      />
      <button onClick={checkProduct} disabled={loading}>
        {loading ? 'Checking...' : 'Check'}
      </button>

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}

