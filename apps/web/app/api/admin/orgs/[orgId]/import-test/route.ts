// apps/web/app/api/admin/orgs/[orgId]/import-test/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import {
  TestImportPayload,
  transformImportToDbRows,
} from "@/lib/testImport";

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const sb = createClient().schema("portal");
  const orgId = params.orgId;

  // TODO: super-admin auth check here (if you have one)

  let payload: TestImportPayload;
  try {
    const body = await req.json();
    payload = body as TestImportPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!payload?.test?.name || !payload?.test?.slug) {
    return NextResponse.json(
      { ok: false, error: "Missing test.name or test.slug" },
      { status: 400 }
    );
  }

  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No questions provided" },
      { status: 400 }
    );
  }

  const { testRow, questionRows } = transformImportToDbRows(payload);

  // 1) Insert test row
  const { data: test, error: testError } = await sb
    .from("tests")
    .insert({
      org_id: orgId,
      name: testRow.name,
      slug: testRow.slug,
      description: testRow.description,
      type: testRow.type,
      framework_id: testRow.framework_id,
      report_template_id: testRow.report_template_id,
      is_active: testRow.is_active,
    })
    .select("*")
    .single();

  if (testError || !test) {
    console.error("Insert test error", testError);
    return NextResponse.json(
      { ok: false, error: testError?.message ?? "Failed to create test" },
      { status: 500 }
    );
  }

  const testId = test.id;

  // 2) Insert questions
  const questionsToInsert = questionRows.map((q) => ({
    test_id: testId,
    idx: q.idx,
    question: q.question,
    type: q.type,
    options: q.options,
    profile_map: q.profile_map,
  }));

  const { error: questionsError } = await sb
    .from("test_questions")
    .insert(questionsToInsert);

  if (questionsError) {
    console.error("Insert questions error", questionsError);
    return NextResponse.json(
      { ok: false, error: "Failed to insert questions" },
      { status: 500 }
    );
  }

  // 3) Create a default test link
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const { data: link, error: linkError } = await sb
    .from("test_links")
    .insert({
      test_id: testId,
      token,
      max_uses: null,
      use_count: 0,
    })
    .select("*")
    .single();

  if (linkError) {
    console.error("Insert test link error", linkError);
    return NextResponse.json(
      {
        ok: false,
        error: "Test created but failed to create link",
        test,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    test,
    link,
  });
}
