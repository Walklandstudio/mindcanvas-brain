// apps/web/app/api/admin/orgs/[orgId]/provision-pack/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import { ORG_TEMPLATE_PACKS } from "@/lib/orgTemplatePacks";

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const sb = createClient().schema("portal");

  // TODO: super-admin auth check

  const body = await req.json();
  const { packId } = body as { packId: string };

  const pack = ORG_TEMPLATE_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return NextResponse.json(
      { ok: false, error: "Unknown template pack" },
      { status: 400 }
    );
  }

  const newOrgId = params.orgId;

  // 1) Resolve template org
  const { data: templateOrg, error: templateOrgError } = await sb
    .from("orgs")
    .select("id, slug")
    .eq("slug", pack.templateOrgSlug)
    .single();

  if (templateOrgError || !templateOrg) {
    console.error("Template org error", templateOrgError);
    return NextResponse.json(
      { ok: false, error: "Template org not found" },
      { status: 500 }
    );
  }

  // 2) Fetch template tests
  const { data: templateTests, error: testsError } = await sb
    .from("tests")
    .select("*")
    .eq("org_id", templateOrg.id)
    .in("slug", pack.templateTestSlugs);

  if (testsError || !templateTests || templateTests.length === 0) {
    console.error("Template tests error", testsError);
    return NextResponse.json(
      { ok: false, error: "No template tests found for pack" },
      { status: 500 }
    );
  }

  const createdTests: any[] = [];

  for (const t of templateTests) {
    // 3) Insert new test row for the target org
    const { data: inserted, error: insertError } = await sb
      .from("tests")
      .insert({
        org_id: newOrgId,
        name: t.name,
        slug: t.slug,
        // if you added description:
        description: t.description,
        // include whatever fields your app actually uses:
        type: t.type,
        is_active: true,
        framework_id: t.framework_id,
        report_template_id: t.report_template_id,
        brand_override: t.brand_override,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("Insert cloned test error", insertError);
      continue;
    }

    createdTests.push(inserted);

    const newTestId = inserted.id;

    // 4) Clone questions (if per-test)
    const { data: templateQuestions, error: questionsError } = await sb
      .from("test_questions")
      .select("*")
      .eq("test_id", t.id);

    if (!questionsError && templateQuestions && templateQuestions.length) {
      const clonedQuestions = templateQuestions.map((q) => ({
        test_id: newTestId,
        idx: q.idx,
        question: q.question,
        type: q.type,
        options: q.options,
        profile_map: q.profile_map,
      }));

      const { error: insertQError } = await sb
        .from("test_questions")
        .insert(clonedQuestions);

      if (insertQError) {
        console.error("Clone questions error", insertQError);
      }
    }

    // 5) Seed a test_link
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    const { error: linkError } = await sb.from("test_links").insert({
      test_id: newTestId,
      token,
      max_uses: null,
      use_count: 0,
    });

    if (linkError) {
      console.error("Seed test link error", linkError);
    }
  }

  return NextResponse.json({ ok: true, tests: createdTests });
}
