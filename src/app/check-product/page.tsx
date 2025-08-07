'use client';
import { useState } from 'react';

export default function CheckProductPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string| null>(null);
  const [loading, setLoading] = useState(false);

  const checkProduct = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch('/api/ti-query', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' },
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

  return (
    <main>
      <h1>Check TI Product</h1>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Enter product ID"
      />
      <button onClick={checkProduct} disabled={loading}>
        {loading ? 'Checking...' : 'Check'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}

