import { useState } from 'react';

export default function CheckProduct() {
  const [part, setPart] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkPart = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/ti-query?partNumber=${part}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError('Could not fetch product data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Check TI Product</h1>
      <input
        type="text"
        placeholder="Enter TI Part Number"
        value={part}
        onChange={(e) => setPart(e.target.value)}
        style={{ padding: 8, marginRight: 8 }}
      />
      <button onClick={checkPart} disabled={loading || !part}>
        {loading ? 'Checking...' : 'Check'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <pre
          style={{
            marginTop: 20,
            padding: 20,
            background: '#f0f0f0',
            borderRadius: 8,
            maxWidth: 800,
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

