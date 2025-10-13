// apps/portal/app/test/[slug]/page.tsx
import TestClient from "./TestClient";

export default async function Page(props: any) {
  // Handle both Promise-wrapped and plain objects (Next 15 type quirk)
  const params =
    typeof props?.params?.then === "function"
      ? await props.params
      : props?.params ?? {};

  const searchParams =
    typeof props?.searchParams?.then === "function"
      ? await props.searchParams
      : props?.searchParams ?? {};

  const slug = params.slug as string;
  const { sid, name, email, phone } = searchParams ?? {};

  return (
    <TestClient
      slug={slug}
      initialSid={sid}
      prefill={{ name, email, phone }}
    />
  );
}

