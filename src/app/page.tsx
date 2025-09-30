import Link from 'next/link';

function Card({
  title,
  desc,
  href,
  emoji,
  badge,
}: {
  title: string;
  desc: string;
  href: string;
  emoji: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: '#eaeaea',
        border: '1px solid #222',
        borderRadius: 16,
        padding: 16,
        background: '#0f0f0f',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          <span style={{ marginRight: 8 }}>{emoji}</span>
          {title}
        </div>
        {badge && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 999,
              border: '1px solid #222',
              background: '#111',
              color: badge === 'LIVE' ? '#f87171' : '#60a5fa',
            }}
            title="Order mode"
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: '#a1a1a1' }}>{desc}</div>
    </Link>
  );
}

export default function HomePage() {
  // Tryb pobieramy z env publicznego (ustaw w .env.local i/lub w Vercel)
  const MODE = (process.env.NEXT_PUBLIC_TI_ORDER_MODE || process.env.TI_ORDER_MODE || 'test')
    .toString()
    .toUpperCase();

  const isProd = MODE === 'PROD' || MODE === 'LIVE';
  const orderBadge = isProd ? 'LIVE' : 'TEST';
  const orderDesc = isProd
    ? 'Złóż PRAWDZIWE zamówienie przez Store API. Create + Retrieve.'
    : 'Złóż zamówienie TESTOWE przez Store API. Create + Retrieve.';

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>TI-Panel</h1>
      <p style={{ color: '#a1a1a1', marginBottom: 20 }}>
        Szybkie narzędzia do zakupów TI (API): inventory, ceny, koszyk i zamówienia.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        <Card
          emoji="📦"
          title="Inventory & Pricing"
          desc="Sprawdź dostępność i progi cenowe. Dodawaj pozycje do koszyka."
          href="/tools/inventory"
        />

        <Card
          emoji="🧾"
          title="Order"
          desc={orderDesc}
          href="/tools/order"
          badge={orderBadge}
        />

        <Card
          emoji="📚"
          title="History"
          desc="Historia zamówień, śledzenie wysyłek (ASN) i pobieranie dokumentów (PDF)."
          href="/tools/history"
        />
      </div>
    </main>
  );
}
