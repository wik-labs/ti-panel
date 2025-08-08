import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#0b0b0b',
          color: '#eaeaea',
        }}
      >
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
            }}
          >
            <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: '#eaeaea' }}>
              TI-Panel
            </Link>

            <nav style={{ display: 'flex', gap: 16 }}>
              <Link href="/inventory">Inventory & Pricing</Link>
              <Link href="/generic-search">Generic Search</Link>
              <Link href="/order">Order</Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}

