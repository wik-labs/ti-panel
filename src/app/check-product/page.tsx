// src/app/check-product/page.tsx
import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const part = Array.isArray(sp?.part) ? sp.part[0] : sp?.part;
  redirect(part ? `/inventory?pn=${encodeURIComponent(part)}` : '/inventory');
}

