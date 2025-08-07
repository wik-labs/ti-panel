// src/app/check-product/page.tsx
import dynamic from 'next/dynamic'

// Dynamic import of the client component, disabling SSR
const ClientComponent = dynamic(
  () => import('./ClientComponent'),
  { ssr: false }
)

export default function Page() {
  return <ClientComponent />
}

