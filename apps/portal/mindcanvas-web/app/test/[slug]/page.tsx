// app/test/[slug]/page.tsx
import { Suspense } from "react";
import TestClient from "./TestClient"; // default import (fixes “no exported member”)

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sid?: string;
    name?: string;
    email?: string;
    phone?: string;
  }>;
};

export default async function Page(props: PageProps) {
  const { slug } = await props.params;
  const { sid, name, email, phone } = await props.searchParams;

  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl p-6">Loading…</div>}>
      <TestClient
        slug={slug}
        sid={sid}
        prefill={{ name, email, phone }}
      />
    </Suspense>
  );
}
