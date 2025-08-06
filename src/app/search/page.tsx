'use client';

import { useState } from 'react';
import Header from '@/components/Header';

export default function SearchPage() {
  const [partNumber, setPartNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/product?partNumber=${partNumber}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error fetching product');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Header />
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Search for a TI Product</h1>
        <input
          type="text"
          className="border p-2 mr-2"
          placeholder="Enter part number (e.g. OPA333AIDBVT)"
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
        />
        <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded">
          Search
        </button>

        {error && <p className="text-red-600 mt-4">{error}</p>}

        {result && (
          <div className="mt-6 bg-gray-100 p-4 rounded">
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </main>
    </>
  );
}

