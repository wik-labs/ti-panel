import Head from 'next/head';
import Header from '../components/Header';

export default function Home() {
  return (
    <>
      <Head>
        <title>TI Panel</title>
        <meta name="description" content="TI Panel" />
      </Head>
      <Header />
      <main className="p-8">
        <h1 className="text-3xl font-bold">Welcome to TI Panel</h1>
        <p className="mt-4">Use the search tab to find products from Texas Instruments.</p>
      </main>
    </>
  );
}

