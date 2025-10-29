import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadFrameworkBySlug } from "@/lib/frameworks";

type AB = "A" | "B" | "C" | "D";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function toPercentages(totals: Partial<Record<AB, number>> | null | undefined): Record<AB, number> {
  const A = Number(totals?.A || 0);
  const B = Number(totals?.B || 0);
  const C = Number(totals?.C || 0);
  const D = Number(totals?.D || 0);
  const sum = A + B + C + D;
  if (sum <= 0) return { A: 0, B: 0, C: 0, D: 0 };
  return { A: A / sum, B: B / sum, C: C / sum, D: D / sum };
}

async function resolveOrgSlugByTokenAndTaker(
  sb: ReturnType<typeof supa>,
  token: string,
  takerId?: string | null,
) {
  // 1) From link → org_id → v_organizations.slug
  const { data: link } = await sb
    .from("test_links")
    .select("org_id")
    .eq("token", token)
    .maybeSingle();

  if (link?.org_id) {
    const { data: org } = await sb
      .from("v_organizations")
      .select("slug")
      .eq("id", link.org_id)
      .maybeSingle();
    if (org?.slug) return org.slug as string;
  }

  // 2) Fallback: via taker → test_id → optional view (v_org_tests) if present
  if (takerId) {
    const { data: taker } = await sb
      .from("test_takers")
      .select("test_id")
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();

    const testId = taker?.test_id;
    if (testId) {
      try {
        // If v_org_tests exists (test_id → org_slug), prefer it.
        const { data: vt, error: vtErr } = await sb
          .from("v_org_tests" as any)
          .select("org_slug")
          .eq("test_id", testId)
          .limit(1)
          .maybeSingle();

        if (!vtErr && vt?.org_slug) return vt.org_slug as string;
      } catch {
        // view may not exist; safely ignore
      }
    }
  }

  // 3) Final safe default
  return process.env.DEFAULT_ORG_SLUG || "competency-coach";
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    const { searchParams } = new URL(req.url);
    const tid = searchParams.get("tid");

    const sb = supa();

    // Resolve taker (optional, but helps fetch results/submissions)
    const { data: taker } = await sb
      .from("test_takers")
      .select("id, test_id, first_name, last_name, email")
      .eq("id", tid)
      .eq("link_token", token)
      .maybeSingle();

    // Prefer test_results.totals, fallback to last test_submissions.totals
    let totals: Partial<Record<AB, number>> | null = null;

    if (taker?.id) {
      const { data: resultRow } = await sb
        .from("test_results")
        .select("totals")
        .eq("taker_id", taker.id)
        .maybeSingle();
      if (resultRow?.totals) totals = resultRow.totals as any;

      if (!totals) {
        const { data: sub } = await sb
          .from("test_submissions")
          .select("totals")
          .eq("taker_id", taker.id)
          .eq("link_token", token)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sub?.totals) totals = sub.totals as any;
      }
    }

    totals = totals ?? { A: 0, B: 0, C: 0, D: 0 };
    const percentages = toPercentages(totals);

    // Load correct framework labels by org_slug
    const org_slug = await resolveOrgSlugByTokenAndTaker(sb, token, taker?.id);
    const framework = await loadFrameworkBySlug(org_slug);

    const frequency_labels =
      (framework.framework.frequencies || []).map((f) => ({ code: f.code, name: f.name }));

    const profile_labels =
      (framework.framework.profiles || []).map((p) => ({
        code: p.code,
        name: p.name,
        frequency: (p.frequencies?.[0] ?? "A") as AB,
      }));

    return NextResponse.json({
      ok: true,
      data: {
        org_slug,
        org_name: framework.framework.name || null,
        test_name: taker ? undefined : "Profile Test",
        taker: taker
          ? { id: taker.id, first_name: taker.first_name, last_name: taker.last_name, email: taker.email }
          : null,
        totals,
        percentages,
        frequency_labels,
        profile_labels,
        version: "report-v2",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
