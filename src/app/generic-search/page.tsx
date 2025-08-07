'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function GenericSearchPage() {
  const [generic, setGeneric] = useState('');
  const [variants, setVariants] = useState<
    { tiPartNumber: string; [key: string]: any }[]
  >([]);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  const searchGeneric = async () => {
    setLoading(true);
    setError(null);
    setVariants([]);

    const res = await fetch('/api/ti-generic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generic }),
    });

    if (!res.ok) {
      setError('No variants found');
    } else {
      const data: { tiPartNumber: string }[] = await res.json();
      setVariants(data);
    }
    setLoading(false);
  };

  return (
    <main>
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
              {/* Link do check-product */}
              <Link href={`/check-product?part=${encodeURIComponent(v.tiPartNumber)}`}>
                {v.tiPartNumber}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

