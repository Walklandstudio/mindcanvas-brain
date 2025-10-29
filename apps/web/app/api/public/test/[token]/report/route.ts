import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadFrameworkBySlug } from "@/lib/frameworks";

type AB = "A" | "B" | "C" | "D";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function coerceNumber(x: unknown, d = 0): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function toPercentagesFixed(rec: Record<string, number>): Record<string, number> {
  const vals = Object.values(rec);
  const sum = vals.reduce((a, b) => a + coerceNumber(b, 0), 0);
  const out: Record<string, number> = {};
  for (const k of Object.keys(rec)) {
    const v = coerceNumber(rec[k], 0);
    out[k] = sum > 0 ? v / sum : 0;
  }
  return out;
}

function normalizeABTotals(input: Partial<Record<AB, unknown>>): Record<AB, number> {
  return {
    A: coerceNumber(input.A, 0),
    B: coerceNumber(input.B, 0),
    C: coerceNumber(input.C, 0),
    D: coerceNumber(input.D, 0),
  };
}

function profileCodeToFreq(code: string): AB | null {
  const s = String(code || "").trim().toUpperCase();
  const m = s.match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
  if (m) {
    const n = Number(m[1]);
    return (n <= 2 ? "A" : n <= 4 ? "B" : n <= 6 ? "C" : "D") as AB;
  }
  const ch = s[0];
  return ch === "A" || ch === "B" || ch === "C" || ch === "D" ? (ch as AB) : null;
}

async function resolveOrgSlug(
  sb: ReturnType<typeof supa>,
  token: string,
  takerId?: string | null
): Promise<string> {
  // 1) via link → org_id → v_organizations.slug
  const { data: link } = await sb.from("test_links").select("org_id").eq("token", token).maybeSingle();
  if (link?.org_id) {
    const { data: org } = await sb.from("v_organizations").select("slug").eq("id", link.org_id).maybeSingle();
    if (org?.slug) return org.slug as string;
  }

  // 2) fallback via taker → test → v_org_tests (if present)
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
        const { data: vt } = await sb
          .from("v_org_tests" as any)
          .select("org_slug")
          .eq("test_id", testId)
          .maybeSingle();
        if (vt?.org_slug) return vt.org_slug as string;
      } catch {
        // optional view may not exist: ignore
      }
    }
  }

  // 3) last resort default
  return process.env.DEFAULT_ORG_SLUG || "competency-coach";
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    const { searchParams } = new URL(req.url);
    const tid = searchParams.get("tid");

    const sb = supa();

    // Taker (optional)
    const { data: taker } = await sb
      .from("test_takers")
      .select("id, test_id, first_name, last_name, email")
      .eq("id", tid)
      .eq("link_token", token)
      .maybeSingle();

    // ----------------- Frequency totals (results → submissions) -----------------
    let freqTotals: Partial<Record<AB, unknown>> | null = null;

    if (taker?.id) {
      const { data: r } = await sb
        .from("test_results")
        .select("totals")
        .eq("taker_id", taker.id)
        .maybeSingle();
      if (r?.totals) freqTotals = r.totals as any;

      if (!freqTotals) {
        const { data: s } = await sb
          .from("test_submissions")
          .select("totals")
          .eq("taker_id", taker.id)
          .eq("link_token", token)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (s?.totals) freqTotals = s.totals as any;
      }
    }

    const frequency_totals = normalizeABTotals(freqTotals || {});
    const frequency_percentages = toPercentagesFixed(frequency_totals) as Record<AB, number>;

    // ----------------- Profile totals (derive from latest answers_json) -----------------
    const profileTotals: Record<string, number> = {};
    if (taker?.id) {
      const { data: sub } = await sb
        .from("test_submissions")
        .select("answers_json")
        .eq("taker_id", taker.id)
        .eq("link_token", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub?.answers_json && Array.isArray(sub.answers_json)) {
        const { data: questions } = await sb
          .from("test_questions")
          .select("id, profile_map")
          .eq("test_id", taker.test_id);

        const qById: Record<string, any> = Object.fromEntries((questions || []).map((q: any) => [q.id, q]));

        for (const row of sub.answers_json as any[]) {
          const qid = row?.question_id || row?.qid || row?.id;
          const q = qById[qid];
          if (!q || !Array.isArray(q.profile_map)) continue;

          // client sends 1..N; convert to 0-based
          const sel =
            typeof row?.value === "number"
              ? row.value - 1
              : typeof row?.index === "number"
              ? row.index
              : typeof row?.selected === "number"
              ? row.selected
              : typeof row?.selected_index === "number"
              ? row.selected_index
              : null;

          if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

          const entry = q.profile_map[sel] || {};
          const pts = coerceNumber(entry?.points, 0);
          let code = String(entry?.profile || "").trim();

          if (!pts || !code) continue;

          // normalize to PROFILE_#
          const mm = code.toUpperCase().match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
          if (mm) code = `PROFILE_${mm[1]}`;

          profileTotals[code] = (profileTotals[code] || 0) + pts;
        }
      }
    }
    const profile_percentages = toPercentagesFixed(profileTotals);

    // ----------------- Labels via framework for the correct org -----------------
    const org_slug = await resolveOrgSlug(sb, token, taker?.id);
    const framework = await loadFrameworkBySlug(org_slug);

    const frequency_labels = (framework.framework.frequencies || []).map((f) => ({
      code: f.code,
      name: f.name,
    }));

    const profile_labels = (framework.framework.profiles || []).map((p) => ({
      code: p.code,
      name: p.name,
      frequency: (p.frequencies?.[0] ?? "A") as AB,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        org_slug,
        taker: taker
          ? {
              id: taker.id,
              first_name: taker.first_name,
              last_name: taker.last_name,
              email: taker.email,
            }
          : null,
        frequency_totals,
        frequency_percentages,
        profile_percentages,
        frequency_labels,
        profile_labels,
        version: "report-v3-fixed",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
