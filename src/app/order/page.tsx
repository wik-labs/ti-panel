import { redirect } from 'next/navigation';

export default function OrderRedirectPage() {
  redirect('/tools/order'); // 308 w dev/SSR
}
