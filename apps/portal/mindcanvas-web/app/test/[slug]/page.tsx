// app/test/[slug]/page.tsx
import TestClient from './TestClient'

type PageProps = {
  params: { slug: string }
  searchParams: {
    sid?: string
    name?: string
    email?: string
    phone?: string
  }
}

export default function Page({ params, searchParams }: PageProps) {
  const { slug } = params
  const { sid, name, email, phone } = searchParams

  return (
    <TestClient
      slug={slug}
      initialSid={sid}
      prefill={{ name: name ?? '', email: email ?? '', phone: phone ?? '' }}
    />
  )
}
