// src/app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">TI-Panel</h1>

      <nav>
        <ul className="space-y-4">
          <li>
            <Link 
              href="/generic-search" 
              className="text-lg text-blue-400 hover:underline"
            >
              🧩 Generic Search (Variants)
            </Link>
          </li>
          <li>
            <Link 
              href="/inventory" 
              className="text-lg text-blue-400 hover:underline"
            >
              📦 Inventory & Pricing
            </Link>
          </li>
          {/* w przyszłości: Order, Subscriptions, ASN, Invoices… */}
        </ul>
      </nav>
    </main>
  )
}

