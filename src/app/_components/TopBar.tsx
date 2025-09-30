'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const nav = useMemo(
    () => [
      { href: '/tools/inventory', label: 'Inventory & Pricing' },
      { href: '/tools/order', label: 'Order' },
      { href: '/tools/history', label: 'History' }, // <— NOWE
    ],
    []
  );

  async function logout() {
    try {
      setBusy(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }

  function isActive(href: string) {
    // aktywne gdy ścieżka zaczyna się od href
    return pathname === href || pathname?.startsWith(href + '/');
  }

  const mode = (process.env.NEXT_PUBLIC_TI_ORDER_MODE ?? process.env.TI_ORDER_MODE ?? 'test').toUpperCase();

  return (
    <header
      style={{
        borderBottom: '1px solid #222',
        position: 'sticky',
        top: 0,
        background: '#0b0b0b',
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 16px',
          gap: 12,
        }}
      >
        <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: '#eaeaea' }}>
          TI-Panel
        </Link>

        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: active ? '#fff' : '#a1a1a1',
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 500,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: active ? '#171717' : 'transparent',
                  border: active ? '1px solid #222' : '1px solid transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 999,
              border: '1px solid #222',
              color: mode === 'TEST' ? '#60a5fa' : '#f87171',
              background: '#111',
            }}
            title="Order mode"
          >
            {mode}
          </span>
          <button
            onClick={logout}
            disabled={busy}
            style={{
              fontSize: 13,
              color: '#eaeaea',
              background: '#111',
              border: '1px solid #222',
              padding: '6px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
            title="Sign out"
          >
            {busy ? '…' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
}
