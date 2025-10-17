// apps/web/app/api/admin/import-client/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/_lib/supabaseAdmin";

type OrgInput = {
  name: string;
  slug: string;
  logo_url?: string | null;
  brand_voice?: string | null;
};

type ProfileInput = {
  code: string; // e.g., P1..P8
  name: string;
  flow?: string | null; // Natural / Neutral / Unnatural (optional)
};

type TestInput = {
  name: string;
  slug: string; // unique per org
  mode?: "free" | "full";
  status?: "active" | "archived";
};

type QuestionInput = {
  idx: number; // 1..N
  text: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  weightsA: Record<string, number>;
  weightsB: Record<string, number>;
  weightsC: Record<string, number>;
  weightsD: Record<string, number>;
};

type ImportPayload = {
  org: OrgInput;
  profiles: ProfileInput[];
  tests: TestInput[];
  questions?: QuestionInput[];
};

function requireAdmin(req: Request) {
  const secret = process.env.ADMIN_IMPORT_SECRET;
  const header = req.headers.get("x-admin-secret");
  return Boolean(secret && header && header === secret);
}

export async function POST(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ImportPayload;
  try {
    body = (await req.json()) as ImportPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body?.org?.name || !body?.org?.slug) {
    return NextResponse.json(
      { error: "org.name and org.slug are required" },
      { status: 400 }
    );
  }

  const sb = getAdminClient();
  const summary: any = {
    org: null,
    profiles_upserted: 0,
    tests_upserted: 0,
    questions_upserted: 0,
    options_upserted: 0,
  };

  // 1) Upsert organization by slug
  const { data: existingOrgBySlug, error: orgSelErr } = await sb
    .from("organizations")
    .select("id")
    .eq("slug", body.org.slug)
    .maybeSingle();
  if (orgSelErr) {
    return NextResponse.json({ error: orgSelErr.message }, { status: 400 });
  }

  // Make orgId a definite string (no union)
  let orgId: string;
  if (!existingOrgBySlug) {
    const { data: orgIns, error: orgInsErr } = await sb
      .from("organizations")
      .insert({ name: body.org.name, slug: body.org.slug })
      .select("id")
      .maybeSingle();
    if (orgInsErr || !orgIns) {
      return NextResponse.json({ error: orgInsErr?.message ?? "failed to create org" }, { status: 400 });
    }
    orgId = String(orgIns.id);
  } else {
    orgId = String(existingOrgBySlug.id);
    const { error: orgUpdErr } = await sb
      .from("organizations")
      .update({ name: body.org.name })
      .eq("id", orgId);
    if (orgUpdErr) {
      return NextResponse.json({ error: orgUpdErr.message }, { status: 400 });
    }
  }
  summary.org = { id: orgId, slug: body.org.slug };

  // 2) Brand settings (optional)
  if (body.org.logo_url || body.org.brand_voice) {
    const { error: brandErr } = await sb.from("org_brand_settings").upsert({
      org_id: orgId,
      logo_url: body.org.logo_url ?? null,
      brand_voice: body.org.brand_voice ?? null,
    });
    if (brandErr) return NextResponse.json({ error: brandErr.message }, { status: 400 });
  }

  // 3) Profiles -> org_profile_codes with explicit onConflict
  if (Array.isArray(body.profiles) && body.profiles.length) {
    const rows = body.profiles.map((p) => ({
      org_id: orgId,
      code: p.code,
      name: p.name,
      flow: p.flow ?? null,
    }));
    const { error } = await sb
      .from("org_profile_codes")
      .upsert(rows, { onConflict: "org_id,code" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    summary.profiles_upserted = rows.length;
  }

  // 4) Tests
  const testIdBySlug = new Map<string, string>();
  if (Array.isArray(body.tests) && body.tests.length) {
    for (const t of body.tests) {
      const { data: existingTest, error: testSelErr } = await sb
        .from("org_tests")
        .select("id")
        .eq("org_id", orgId)
        .eq("slug", t.slug)
        .maybeSingle();
      if (testSelErr) return NextResponse.json({ error: testSelErr.message }, { status: 400 });

      if (!existingTest) {
        const { data: ins, error } = await sb
          .from("org_tests")
          .insert({
            org_id: orgId,
            name: t.name,
            slug: t.slug,
            mode: t.mode ?? "full",
            status: t.status ?? "active",
          })
          .select("id")
          .maybeSingle();
        if (error || !ins) return NextResponse.json({ error: error?.message ?? "failed creating test" }, { status: 400 });
        testIdBySlug.set(t.slug, String(ins.id));
      } else {
        const { data: upd, error } = await sb
          .from("org_tests")
          .update({
            name: t.name,
            mode: t.mode ?? "full",
            status: t.status ?? "active",
          })
          .eq("id", existingTest.id)
          .select("id")
          .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        testIdBySlug.set(t.slug, String((upd ?? existingTest).id));
      }
      summary.tests_upserted++;
    }
  }

  // 5) Questions + Options (optional, applied to first test)
  if (Array.isArray(body.questions) && body.questions.length && body.tests?.length) {
    const targetSlug = body.tests[0].slug;
    const testId = testIdBySlug.get(targetSlug);
    if (!testId) {
      return NextResponse.json(
        { error: `test '${targetSlug}' was not created/found` },
        { status: 400 }
      );
    }

    const { data: existingQs, error: qsSelErr } = await sb
      .from("test_questions")
      .select("id, idx")
      .eq("org_id", orgId)
      .eq("test_id", testId);
    if (qsSelErr) return NextResponse.json({ error: qsSelErr.message }, { status: 400 });

    const qIdByIdx = new Map<number, string>(
      (existingQs ?? []).map((r: any) => [Number(r.idx), String(r.id)])
    );

    for (const q of body.questions) {
      let qid = qIdByIdx.get(q.idx);
      if (!qid) {
        const { data: insQ, error: qErr } = await sb
          .from("test_questions")
          .insert({ org_id: orgId, test_id: testId, idx: q.idx, text: q.text })
          .select("id")
          .maybeSingle();
        if (qErr || !insQ) return NextResponse.json({ error: qErr?.message ?? "failed creating question" }, { status: 400 });
        qid = String(insQ.id);
        qIdByIdx.set(q.idx, qid);
      } else {
        const { error: updQErr } = await sb
          .from("test_questions")
          .update({ text: q.text })
          .eq("id", qid);
        if (updQErr) return NextResponse.json({ error: updQErr.message }, { status: 400 });
      }
      summary.questions_upserted++;

      const options = [
        { code: "A", text: q.optA, weights: q.weightsA },
        { code: "B", text: q.optB, weights: q.weightsB },
        { code: "C", text: q.optC, weights: q.weightsC },
        { code: "D", text: q.optD, weights: q.weightsD },
      ] as const;

      for (const opt of options) {
        const { data: existingOpt, error: optSelErr } = await sb
          .from("test_options")
          .select("id")
          .eq("org_id", orgId)
          .eq("question_id", qid)
          .eq("code", opt.code)
          .maybeSingle();
        if (optSelErr) return NextResponse.json({ error: optSelErr.message }, { status: 400 });

        if (!existingOpt) {
          const { error: insOErr } = await sb.from("test_options").insert({
            org_id: orgId,
            question_id: qid,
            code: opt.code,
            text: opt.text,
            weights: opt.weights as any,
          });
          if (insOErr) return NextResponse.json({ error: insOErr.message }, { status: 400 });
        } else {
          const { error: updOErr } = await sb
            .from("test_options")
            .update({ text: opt.text, weights: opt.weights as any })
            .eq("id", existingOpt.id);
          if (updOErr) return NextResponse.json({ error: updOErr.message }, { status: 400 });
        }
        summary.options_upserted++;
      }
    }
  }

  return NextResponse.json({ ok: true, summary }, { status: 200 });
}
