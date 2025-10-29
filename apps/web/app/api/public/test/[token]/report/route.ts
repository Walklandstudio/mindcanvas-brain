import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadFrameworkBySlug } from "@/lib/frameworks";

type AB = "A" | "B" | "C" | "D";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function n(x: unknown, d = 0): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : d;
}

function normalizeAB(input: Partial<Record<AB, unknown>> | null | undefined): Record<AB, number> {
  return { A: n(input?.A), B: n(input?.B), C: n(input?.C), D: n(input?.D) };
}

function sumRec(rec: Record<string, number>): number {
  return Object.values(rec).reduce((a, b) => a + n(b), 0);
}

function toPercentages(rec: Record<string, number>): Record<string, number> {
  const s = sumRec(rec);
  const out: Record<string, number> = {};
  for (const k of Object.keys(rec)) out[k] = s > 0 ? n(rec[k]) / s : 0;
  return out;
}

function topKey(rec: Record<string, number>): string | null {
  let best: string | null = null;
  let max = -Infinity;
  for (const [k, v] of Object.entries(rec)) {
    const vv = n(v);
    if (vv > max) { max = vv; best = k; }
  }
  return best;
}

async function resolveOrgSlug(
  sb: ReturnType<typeof supa>,
  token: string,
  takerId?: string | null
): Promise<string> {
  // 1) via link
  const { data: link } = await sb.from("test_links").select("org_id").eq("token", token).maybeSingle();
  if (link?.org_id) {
    const { data: org } = await sb.from("v_organizations").select("slug").eq("id", link.org_id).maybeSingle();
    if (org?.slug) return org.slug as string;
  }
  // 2) via taker → v_org_tests (optional)
  if (takerId) {
    const { data: taker } = await sb
      .from("test_takers")
      .select("test_id")
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();
    if (taker?.test_id) {
      try {
        const { data: vt } = await sb
          .from("v_org_tests" as any)
          .select("org_slug")
          .eq("test_id", taker.test_id)
          .maybeSingle();
        if (vt?.org_slug) return vt.org_slug as string;
      } catch { /* optional view may not exist */ }
    }
  }
  return process.env.DEFAULT_ORG_SLUG || "competency-coach";
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    const { searchParams } = new URL(req.url);
    const tid = searchParams.get("tid");

    const sb = supa();

    // taker (optional)
    const { data: taker } = await sb
      .from("test_takers")
      .select("id, test_id, first_name, last_name, email")
      .eq("id", tid)
      .eq("link_token", token)
      .maybeSingle();

    // ---------- FREQUENCY TOTALS ----------
    // results.totals → fallback submissions.totals → last-ditch recompute from answers+profile_map
    let freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };

    if (taker?.id) {
      const { data: r } = await sb.from("test_results").select("totals").eq("taker_id", taker.id).maybeSingle();
      if (r?.totals) freqTotals = normalizeAB(r.totals as any);

      if (sumRec(freqTotals) === 0) {
        const { data: s } = await sb
          .from("test_submissions")
          .select("totals, answers_json")
          .eq("taker_id", taker.id)
          .eq("link_token", token)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (s?.totals && sumRec(normalizeAB(s.totals as any)) > 0) {
          freqTotals = normalizeAB(s.totals as any);
        } else if (Array.isArray(s?.answers_json)) {
          // last-ditch: derive freq totals from profile_map → code → A/B/C/D
          const { data: questions } = await sb
            .from("test_questions")
            .select("id, profile_map")
            .eq("test_id", taker.test_id);

          const qById: Record<string, any> = Object.fromEntries((questions || []).map((q: any) => [q.id, q]));
          const freq: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };

          for (const row of s.answers_json as any[]) {
            const qid = row?.question_id || row?.qid || row?.id;
            const q = qById[qid];
            if (!q || !Array.isArray(q.profile_map)) continue;

            const sel =
              typeof row?.value === "number" ? row.value - 1 :
              typeof row?.index === "number" ? row.index :
              typeof row?.selected === "number" ? row.selected :
              typeof row?.selected_index === "number" ? row.selected_index :
              null;

            if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

            const entry = q.profile_map[sel] || {};
            const pts = n(entry?.points, 0);
            let code = String(entry?.profile || "").toUpperCase().trim();
            if (!pts || !code) continue;

            // normalize to PROFILE_#
            const m = code.match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
            if (m) code = `PROFILE_${m[1]}`;

            // map profile code to freq bucket (P1-2=A, 3-4=B, 5-6=C, 7-8=D)
            const m2 = code.match(/^PROFILE_([1-8])$/);
            if (m2) {
              const idx = Number(m2[1]);
              const ab: AB = idx <= 2 ? "A" : idx <= 4 ? "B" : idx <= 6 ? "C" : "D";
              freq[ab] += pts;
            }
          }

          freqTotals = freq;
        }
      }
    }

    const freqPercentages = toPercentages(freqTotals) as Record<AB, number>;

    // ---------- PROFILE PERCENTAGES (derived from latest answers) ----------
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

      if (Array.isArray(sub?.answers_json)) {
        const { data: questions } = await sb
          .from("test_questions")
          .select("id, profile_map")
          .eq("test_id", taker.test_id);

        const qById: Record<string, any> = Object.fromEntries((questions || []).map((q: any) => [q.id, q]));

        for (const row of sub.answers_json as any[]) {
          const qid = row?.question_id || row?.qid || row?.id;
          const q = qById[qid];
          if (!q || !Array.isArray(q.profile_map)) continue;

          const sel =
            typeof row?.value === "number" ? row.value - 1 :
            typeof row?.index === "number" ? row.index :
            typeof row?.selected === "number" ? row.selected :
            typeof row?.selected_index === "number" ? row.selected_index :
            null;

          if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

          const entry = q.profile_map[sel] || {};
          const pts = n(entry?.points, 0);
          let code = String(entry?.profile || "").toUpperCase().trim();
          if (!pts || !code) continue;

          const m = code.match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
          if (m) code = `PROFILE_${m[1]}`;

          profileTotals[code] = (profileTotals[code] || 0) + pts;
        }
      }
    }
    const profilePercentages = toPercentages(profileTotals);

    // ---------- labels via framework ----------
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

    // ---------- legacy fields for backward-compat ----------
    const percentages = freqPercentages;        // legacy key expected by result page
    const totals = freqTotals;                  // legacy key
    const top_freq = (topKey(freqTotals) as AB | null) || "A";
    const top_profile_code = topKey(profileTotals);
    const top_profile_name =
      (top_profile_code && profile_labels.find(p => p.code === top_profile_code)?.name) || null;

    return NextResponse.json({
      ok: true,
      data: {
        // new shape
        org_slug,
        taker: taker ? {
          id: taker.id, first_name: taker.first_name, last_name: taker.last_name, email: taker.email
        } : null,
        frequency_totals: freqTotals,
        frequency_percentages: freqPercentages,
        profile_percentages: profilePercentages,
        frequency_labels,
        profile_labels,
        version: "report-v4-bc",

        // legacy shape (to keep your UI working without changes)
        totals,
        percentages,
        top_freq,
        top_profile_code,
        top_profile_name,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
