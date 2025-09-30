'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Login failed');
      router.push('/'); // po zalogowaniu na home (lub np. /tools/order)
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      // absolutne centrum, niezależnie od otoczenia/layoutu
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 380,
          display: 'grid',
          gap: 12,
          border: '1px solid #222',
          borderRadius: 16,
          padding: 16,
          background: '#0f0f0f',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            textAlign: 'center',
          }}
        >
          Sign in
        </h1>

        <label htmlFor="login-username" style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#a1a1a1' }}>Login</span>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setU(e.target.value)}
            style={{
              border: '1px solid #333',
              borderRadius: 8,
              padding: '10px 12px',
              background: '#0b0b0b',
              color: '#eaeaea',
              outline: 'none',
            }}
          />
        </label>

        <label htmlFor="login-password" style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#a1a1a1' }}>Password</span>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            style={{
              border: '1px solid #333',
              borderRadius: 8,
              padding: '10px 12px',
              background: '#0b0b0b',
              color: '#eaeaea',
              outline: 'none',
            }}
          />
        </label>

        {err && (
          <div
            style={{
              color: '#ef4444',
              fontSize: 13,
              background: '#1a0f10',
              border: '1px solid #7f1d1d',
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          style={{
            marginTop: 4,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #222',
            background: '#111',
            color: '#eaeaea',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading || !username || !password ? 0.6 : 1,
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
