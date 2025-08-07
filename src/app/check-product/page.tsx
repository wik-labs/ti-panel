// src/app/check-product/page.tsx
import React, { Suspense } from 'react';
import ClientComponent from './ClientComponent';

export const dynamic = 'force-dynamic';

export default function CheckProductPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ClientComponent />
    </Suspense>
  );
}

