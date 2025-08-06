import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-gray-900 text-white p-4">
      <nav className="flex justify-between">
        <div className="text-xl font-bold">TI Panel</div>
        <div className="space-x-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/search" className="hover:underline">
            Search
          </Link>
        </div>
      </nav>
    </header>
  );
}

