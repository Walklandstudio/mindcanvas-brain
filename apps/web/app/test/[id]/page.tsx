// apps/web/app/test/[id]/page.tsx
import { getServiceClient } from "../../_lib/supabase";
import TestClient from "./test-client";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const supabase = getServiceClient();
  const { data: test } = await supabase.from("org_tests").select("id,name,mode").eq("id", params.id).maybeSingle();
  const { data: qs } = await supabase
    .from("org_test_questions")
    .select("id,ordinal,qnum,text,options")
    .eq("test_id", params.id)
    .order("ordinal", { ascending: true });

  if (!test || !qs?.length) {
    return <main className="p-8 text-white">Test not found.</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">{test.name}</h1>
      <TestClient testId={test.id} mode={test.mode as "free"|"full"} questions={qs as any} />
    </main>
  );
}
