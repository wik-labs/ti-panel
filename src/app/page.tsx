export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome to TI Panel</h1>
      <p>This is the homepage. Use the menu or go to:</p>
      <ul>
        <li><a href="/check-product">Check Product</a></li>
        <li><a href="/search">Search Products</a></li>
      </ul>
    </main>
  );
}

