import { redirect } from 'next/navigation';

export default function Page({
  searchParams,
}: { searchParams: { part?: string } }) {
  const pn = searchParams?.part;
  redirect(pn ? `/inventory?pn=${encodeURIComponent(pn)}` : '/inventory');
}

