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

/** Try to resolve org slug → correct framework; safe fallbacks */
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
          // some projects use v_org_tests; others don't — swallow if missing
          .from("v_org_tests" as any)
          .select("org_slug")
          .eq("test_id", taker.test_id)
          .maybeSingle();
        if (vt?.org_slug) return vt.org_slug as string;
      } catch {}
    }
  }
  return process.env.DEFAULT_ORG_SLUG || "competency-coach";
}

/** Load labels from DB (preferred). Falls back to framework JSON if tables/views absent. */
async function loadDbLabels(
  sb: ReturnType<typeof supa>,
  test_id?: string | null,
  org_slug_fallback?: string
): Promise<{
  frequency_labels: { code: AB; name: string }[];
  profile_labels: { code: string; name: string; frequency: AB }[];
  nameToCode: Map<string, string>;
}> {
  const freq: { code: AB; name: string }[] = [];
  const prof: { code: string; name: string; frequency: AB }[] = [];
  const nameToCode = new Map<string, string>();

  if (test_id) {
    // frequency labels (try both singular/plural table names to match your DB)
    try {
      const { data } =
        (await sb
          .from("test_frequency_labels")
          .select("frequency_code, frequency_name")
          .eq("test_id", test_id)) ||
        (await sb
          .from("tests_frequency_labels" as any)
          .select("frequency_code, frequency_name")
          .eq("test_id", test_id));
      if (Array.isArray(data)) {
        for (const r of data) {
          const c = String(r.frequency_code || "").toUpperCase() as AB;
          const nm = String(r.frequency_name || "").trim();
          if (["A", "B", "C", "D"].includes(c) && nm) freq.push({ code: c as AB, name: nm });
        }
      }
    } catch {}

    // profile labels
    try {
      const { data } =
        (await sb
          .from("test_profile_names")
          .select("profile_code, profile_name, frequency_code")
          .eq("test_id", test_id)) ||
        (await sb
          .from("tests_profile_names" as any)
          .select("profile_code, profile_name, frequency_code")
          .eq("test_id", test_id));
      if (Array.isArray(data)) {
        for (const r of data) {
          const code = String(r.profile_code || "").trim() || "";
          const name = String(r.profile_name || "").trim() || code;
          const f = String(r.frequency_code || "").toUpperCase();
          const ab: AB = (["A", "B", "C", "D"].includes(f) ? f : null || null) as AB;
          // if frequency_code missing, derive from PROFILE_#
          let freqAB: AB = ab || ((): AB => {
            const m = code.toUpperCase().match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
            if (m) {
              const idx = Number(m[1]);
              return (idx <= 2 ? "A" : idx <= 4 ? "B" : idx <= 6 ? "C" : "D") as AB;
            }
            return "A";
          })();
          prof.push({ code, name, frequency: freqAB });
          nameToCode.set(name, code);
        }
      }
    } catch {}
  }

  // If DB didn’t return anything, use the framework JSON as a safe fallback.
  if (freq.length === 0 || prof.length === 0) {
    const fw = await loadFrameworkBySlug(org_slug_fallback || "competency-coach");
    const f = (fw.framework.frequencies || []).map((x) => ({ code: x.code as AB, name: x.name || x.code }));
    const p = (fw.framework.profiles || []).map((x) => ({
      code: x.code,
      name: x.name,
      frequency: ((x.frequencies?.[0] ?? "A") as AB),
    }));
    // Only fill the ones we don’t already have from DB
    if (freq.length === 0) freq.push(...f);
    if (prof.length === 0) {
      prof.push(...p);
      for (const x of p) nameToCode.set(x.name, x.code);
    }
  }

  // Ensure frequency set has all A-D (fallback names if missing)
  const seen = new Set(freq.map((x) => x.code));
  (["A", "B", "C", "D"] as AB[]).forEach((c) => {
    if (!seen.has(c)) freq.push({ code: c, name: `Frequency ${c}` });
  });

  return { frequency_labels: freq, profile_labels: prof, nameToCode };
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    const { searchParams } = new URL(req.url);
    const tid = searchParams.get("tid");

    const sb = supa();

    // taker
    const { data: taker } = await sb
      .from("test_takers")
      .select("id, test_id, first_name, last_name, email")
      .eq("id", tid)
      .eq("link_token", token)
      .maybeSingle();

    // ----- FREQUENCY TOTALS - results → submissions → last-ditch recompute -----
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
          // derive from profile_map if results/submissions totals empty
          const { data: questions } = await sb
            .from("test_questions")
            .select("id, profile_map")
            .eq("test_id", taker.test_id);

          const qById: Record<string, any> = Object.fromEntries((questions || []).map((q: any) => [q.id, q]));
          const acc: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };

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

            const m = code.match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
            if (m) {
              const idx = Number(m[1]);
              const ab: AB = idx <= 2 ? "A" : idx <= 4 ? "B" : idx <= 6 ? "C" : "D";
              acc[ab] += pts;
            }
          }
          freqTotals = acc;
        }
      }
    }

    const freqPercentages = toPercentages(freqTotals) as Record<AB, number>;

    // ----- LABELS (DB preferred; fall back to framework JSON) -----
    const org_slug = await resolveOrgSlug(sb, token, taker?.id);
    const { frequency_labels, profile_labels, nameToCode } = await loadDbLabels(sb, taker?.test_id, org_slug);

    // Build helpers
    const profileCodeToFreq = (code: string): AB => {
      const m = code.toUpperCase().match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
      if (m) {
        const idx = Number(m[1]);
        return (idx <= 2 ? "A" : idx <= 4 ? "B" : idx <= 6 ? "C" : "D") as AB;
      }
      // fallback by looking up label entry if possible
      const found = profile_labels.find((p) => p.code === code);
      return (found?.frequency ?? "A") as AB;
    };

    // ----- PROFILE PERCENTAGES (derived from answers_json + profile_map) -----
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
          let raw = String(entry?.profile || "").trim();
          if (!pts || !raw) continue;

          // Accept either PROFILE_# or a profile NAME; normalize to code
          let code = raw.toUpperCase();
          const m = code.match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
          if (m) {
            code = `PROFILE_${m[1]}`;
          } else {
            // try map by name (DB labels preferred)
            const byDb = nameToCode.get(raw) || nameToCode.get(raw.replace(/Coach$/i, "Coach")); // tiny tolerance
            if (byDb) code = byDb;
          }

          // still not normalized? fall back by label list
          if (!/^PROFILE_[1-8]$/.test(code)) {
            const byLabel = profile_labels.find((p) => p.name.toLowerCase() === raw.toLowerCase());
            if (byLabel) code = byLabel.code;
          }

          // final guard
          if (!/^PROFILE_[1-8]$/.test(code)) continue;

          profileTotals[code] = (profileTotals[code] || 0) + pts;
        }
      }
    }
    const profilePercentages = toPercentages(profileTotals);

    // ----- legacy fields to keep your current Result page happy -----
    const percentages = freqPercentages; // legacy key your UI expects
    const totals = freqTotals;
    const top_freq = (topKey(freqTotals) as AB | null) || "A";
    const top_profile_code = topKey(profileTotals);
    const top_profile_name =
      (top_profile_code && profile_labels.find((p) => p.code === top_profile_code)?.name) || null;

    return NextResponse.json({
      ok: true,
      data: {
        org_slug,
        taker: taker
          ? { id: taker.id, first_name: taker.first_name, last_name: taker.last_name, email: taker.email }
          : null,
        frequency_totals: freqTotals,
        frequency_percentages: freqPercentages,
        profile_percentages: profilePercentages,
        frequency_labels,
        profile_labels,
        version: "report-v5-db-labels",

        // legacy keys
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
