'use client';
import { useState } from 'react';

interface Variant {
  tiPartNumber: string;
  // …inne pola
}

export default function GenericSearchPage() {
  const [generic, setGeneric] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError]       = useState<string|null>(null);
  const [loading, setLoading]   = useState(false);

  const searchGeneric = async () => {
    setLoading(true);
    setError(null);
    setVariants([]);

    const res = await fetch('/api/ti-generic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generic }),
    });

    if (res.status === 429) {
      setError('Rate limit exceeded. Please wait up to 4 hours and try again.');
    }
    else if (!res.ok) {
      setError('No variants found');
    }
    else {
      const data = (await res.json()) as Variant[];
      setVariants(data);
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: '1rem' }}>
      <h1>Search by Generic Part Number</h1>
      <input
        type="text"
        value={generic}
        onChange={e => setGeneric(e.target.value)}
        placeholder="Enter generic part number"
      />
      <button onClick={searchGeneric} disabled={loading}>
        {loading ? 'Searching…' : 'Search'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {variants.length > 0 && (
        <ul>
          {variants.map(v => (
            <li key={v.tiPartNumber}>
              <a href={`/check-product?part=${encodeURIComponent(v.tiPartNumber)}`}>
                {v.tiPartNumber}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

