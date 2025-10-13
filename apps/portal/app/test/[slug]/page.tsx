// app/test/[slug]/page.tsx
import TestClient from './TestClient'

type PageProps = {
  params: { slug: string }
  searchParams: Promise<{
    sid?: string
    name?: string
    email?: string
    phone?: string
  }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = params
  const sp = await searchParams
  const { sid, name, email, phone } = sp ?? {}

  return (
    <TestClient
      slug={slug}
      initialSid={sid}
      prefill={{ name, email, phone }}
    />
  )
}
