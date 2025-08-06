'use client';

import { useState } from 'react';
import Header from '@/components/Header';

export default function SearchPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ti-query', {
        method: 'POST',
        body: JSON.stringify({ query: input }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: Record<string, unknown> = await res.json();
      setResult(data);
    } catch {
      console.error('Error while fetching');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main>
        <h1>Search TI Products</h1>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter part number"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>

        {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      </main>
    </>
  );
}

