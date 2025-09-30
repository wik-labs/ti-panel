import TopBar from './_components/TopBar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <TopBar />
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>{children}</main>
      </body>
    </html>
  );
}
