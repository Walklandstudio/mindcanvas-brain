// apps/web/app/portal/tests/[testId]/page.tsx
import { getServerSupabase, getActiveOrg } from "@/app/_lib/portal";

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const sb = await getServerSupabase();
  const org = await getActiveOrg(sb);

  // Try UUID, then slug
  const byId = await sb
    .from("org_tests")
    .select("id, name, slug, status, mode, created_at")
    .eq("org_id", org.id)
    .eq("id", testId)
    .maybeSingle();

  const test =
    byId.data ??
    (await sb
      .from("org_tests")
      .select("id, name, slug, status, mode, created_at")
      .eq("org_id", org.id)
      .eq("slug", testId)
      .maybeSingle()).data;

  if (!test) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Test not found</h1>
      </div>
    );
  }

  const { data: questions } = await sb
    .from("test_questions")
    .select("id, idx, text")
    .eq("org_id", org.id)
    .eq("test_id", test.id)
    .order("idx", { ascending: true });

  const { data: options } = await sb
    .from("test_options")
    .select("id, question_id, idx, code, label, text")
    .eq("org_id", org.id)
    .in(
      "question_id",
      (questions ?? []).map((q: any) => q.id)
    )
    .order("idx", { ascending: true });

  const optsByQ = new Map<string, any[]>();
  (options ?? []).forEach((o: any) => {
    const arr = optsByQ.get(o.question_id) ?? [];
    arr.push(o);
    optsByQ.set(o.question_id, arr);
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{test.name}</h1>
      <div className="text-sm text-gray-600">/{test.slug} · {test.status} · {test.mode}</div>

      <div className="rounded-lg border">
        {(questions ?? []).map((q: any) => (
          <div key={q.id} className="p-4 border-b last:border-b-0">
            <div className="font-medium mb-2">Q{q.idx}. {q.text}</div>
            <ul className="list-disc ml-6 space-y-1">
              {(optsByQ.get(q.id) ?? []).map((o: any) => (
                <li key={o.id}>
                  <span className="font-medium">{o.code}.</span> {o.text ?? o.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {(!questions || questions.length === 0) && (
          <div className="p-4 text-gray-500">No questions yet.</div>
        )}
      </div>

      <div>
        <a className="text-blue-600 hover:underline" href="/portal/tests">← Back to Tests</a>
      </div>
    </div>
  );
}
