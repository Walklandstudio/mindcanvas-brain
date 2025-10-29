import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AB = "A" | "B" | "C" | "D";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

const ORG_FREQ_LABELS: Record<string, Record<AB, string>> = {
  "team-puzzle": { A: "Innovation", B: "Influence", C: "Implementation", D: "Insight" },
  "competency-coach": { A: "Catalyst", B: "Communicator", C: "Rhythmic", D: "Observer" },
};

function sumABCD(t: any) {
  const A = Number(t?.A ?? t?.a ?? 0);
  const B = Number(t?.B ?? t?.b ?? 0);
  const C = Number(t?.C ?? t?.c ?? 0);
  const D = Number(t?.D ?? t?.d ?? 0);
  return { A, B, C, D, total: A + B + C + D };
}

function toPercentagesFromABCD(t: { A: number; B: number; C: number; D: number }) {
  const s = t.A + t.B + t.C + t.D;
  if (s <= 0) return null;
  return { A: t.A / s, B: t.B / s, C: t.C / s, D: t.D / s } as const;
}

// If CC profiles don't include frequency on the record, you can hard-map P1–P8 here once:
const PROFILE_TO_FREQ_CC: Record<string, AB> = {
  // Fill if your CC profile_labels lack "frequency" fields
  // "P1": "A", "P2": "A", "P3": "B", "P4": "B", "P5": "C", "P6": "C", "P7": "D", "P8": "D"
};

function buildProfileToFreqMap(profileLabels: any[], orgSlug: string): Map<string, AB> {
  const map = new Map<string, AB>();
  for (const p of profileLabels || []) {
    const code = String(p.code || p.id || p.key || p.slug || p.name || "").toUpperCase();
    const freq = (p.frequency || p.freq || p.flow || "").toString().toUpperCase();
    if (["A","B","C","D"].includes(freq)) map.set(code, freq as AB);
  }
  // Competency Coach fallback mapping (only if labels lacked frequencies)
  if (orgSlug === "competency-coach" && map.size === 0) {
    for (const [k, v] of Object.entries(PROFILE_TO_FREQ_CC)) map.set(k.toUpperCase(), v);
  }
  return map;
}

/**
 * Attempt to reconstruct profile totals from answers_json.
 * We accept a few common shapes:
 *  - answers_json: [{ options:[{profile, points}...], selected: 0|1|... }, ...]
 *  - answers_json: [{ selected: { profile, points } }, ...]
 *  - answers_json: [{ value: { profile, points } }, ...]
 */
function deriveProfileTotalsFromAnswers(answersJson: any): Record<string, number> {
  const totals: Record<string, number> = {};
  if (!answersJson) return totals;

  const rows: any[] = Array.isArray(answersJson) ? answersJson : answersJson.rows || answersJson.items || [];
  for (const row of rows) {
    // Case 1: options[] + selected index
    if (Array.isArray(row?.options) && (typeof row?.selected === "number" || typeof row?.selected_index === "number")) {
      const idx = Number(row.selected ?? row.selected_index);
      const opt = row.options[idx];
      const profile = opt?.profile ?? opt?.code ?? opt?.id ?? null;
      const points = Number(opt?.points ?? opt?.score ?? 0);
      if (profile && points) {
        const key = String(profile).toUpperCase();
        totals[key] = (totals[key] || 0) + points;
      }
      continue;
    }
    // Case 2: selected object with profile/points
    if (row?.selected && typeof row.selected === "object") {
      const profile = row.selected.profile ?? row.selected.code ?? row.selected.id ?? null;
      const points = Number(row.selected.points ?? row.selected.score ?? 0);
      if (profile && points) {
        const key = String(profile).toUpperCase();
        totals[key] = (totals[key] || 0) + points;
      }
      continue;
    }
    // Case 3: value object with profile/points
    if (row?.value && typeof row.value === "object") {
      const profile = row.value.profile ?? row.value.code ?? row.value.id ?? null;
      const points = Number(row.value.points ?? row.value.score ?? 0);
      if (profile && points) {
        const key = String(profile).toUpperCase();
        totals[key] = (totals[key] || 0) + points;
      }
      continue;
    }
    // Case 4: direct profile & points on row
    if (row?.profile || row?.code || row?.id) {
      const profile = row.profile ?? row.code ?? row.id;
      const points = Number(row.points ?? row.score ?? 0);
      if (profile && points) {
        const key = String(profile).toUpperCase();
        totals[key] = (totals[key] || 0) + points;
      }
    }
  }
  return totals;
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const token = params.token;
    const takerId = searchParams.get("tid");

    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    if (!takerId) return NextResponse.json({ ok: false, error: "Missing taker id (tid)" }, { status: 400 });

    const sb = supa();

    // Resolve link → org slug (via view if available)
    const { data: linkRow } = await sb
      .from("test_links")
      .select("id, org_id, test_id, token, org_slug")
      .eq("token", token)
      .maybeSingle();

    let orgSlug: string =
      (linkRow as any)?.org_slug ||
      (await (async () => {
        const { data: orgView } = await sb
          .from("v_organizations" as any)
          .select("slug")
          .eq("id", linkRow?.org_id)
          .maybeSingle();
        return orgView?.slug || "competency-coach";
      })());

    // Taker snapshot (for name)
    const { data: taker } = await sb
      .from("test_takers")
      .select("id, first_name, last_name, email")
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();

    // Preferred source: results
    const { data: result } = await sb
      .from("test_results")
      .select("totals, created_at")
      .eq("taker_id", takerId)
      .maybeSingle();

    let totals: any = result?.totals || null;

    // Fallback: submissions.totals and answers_json
    const { data: submission } = await sb
      .from("test_submissions")
      .select("totals, answers_json, created_at")
      .eq("taker_id", takerId)
      .eq("link_token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!totals) totals = submission?.totals || null;

    // Labels (Team Puzzle & CC)
    const frequency_labels = ORG_FREQ_LABELS[orgSlug] || ORG_FREQ_LABELS["competency-coach"];

    // Profile labels (from your seeding or JSON source – if your existing API attaches them, keep it)
    // For safety, try to echo profile_labels from the latest test definition if your system stores them.
    // Here we return empty and let the client show only frequency mix unless you already attach them elsewhere.
    let profile_labels: Array<{ code: string; name: string; frequency?: AB }> = [];

    // If your public meta endpoint already attaches profile_labels, you can load it here instead:
    // (Leaving minimal to avoid new dependencies)

    // Compute percentages:
    let percentages: Record<AB, number> | null = null;

    // 1) Directly from A/B/C/D totals
    const abcd = sumABCD(totals);
    if (abcd.total > 0) {
      const p = toPercentagesFromABCD(abcd);
      if (p) percentages = p as any;
    }

    // 2) If still zero, try reconstructing from answers_json using profile→frequency mapping
    if (!percentages && submission?.answers_json) {
      // If your API (or prior steps) already knows profile_labels with frequency, prefer that.
      // Otherwise we can't reconstruct reliably for orgs that don't ship this mapping.
      // For Team Puzzle your payload already includes profile_labels with frequency (per your sample).
      // We'll try to fetch the same structure via public meta; if not, we fall back to simple derivation:
      const profileTotals = deriveProfileTotalsFromAnswers(submission.answers_json);

      // If we have no mapping yet, try to infer from known naming patterns in profileTotals keys:
      // Better: when your API knows the profile_labels for this org, include them here.
      // For now, percentages will remain null if we can't map.
      // (Safer than guessing wrong.)
      // You can optionally enrich this endpoint by joining your org's profile catalog.

      // Try to build a profile->freq map from profile_labels if present in submission or elsewhere.
      // As a minimal step, if profileTotals keys already look like PROFILE_1..PROFILE_8 and you know orgSlug,
      // try uniform 2-profiles-per-frequency mapping (commented out).
      // Keeping neutral here to avoid mis-mapping.

      // If later you attach profile_labels with .frequency, you can compute here:
      // const pfMap = buildProfileToFreqMap(profile_labels, orgSlug);

      // Example (pseudo):
      // const freq = { A:0, B:0, C:0, D:0 } as Record<AB, number>;
      // for (const [pcode, val] of Object.entries(profileTotals)) {
      //   const f = pfMap.get(pcode.toUpperCase());
      //   if (f) freq[f] += Number(val) || 0;
      // }
      // const s = freq.A+freq.B+freq.C+freq.D;
      // if (s > 0) percentages = { A: freq.A / s, B: freq.B / s, C: freq.C / s, D: freq.D / s };
    }

    const payload = {
      ok: true,
      data: {
        orgSlug,
        orgName: orgSlug === "team-puzzle" ? "Team Puzzle Profile" : "Competency Coach DNA Blueprint",
        taker: {
          id: taker?.id,
          first_name: taker?.first_name,
          last_name: taker?.last_name,
          email: taker?.email,
        },
        totals: totals || {},
        percentages, // may be null if we couldn't reconstruct
        frequency_labels, // {A:"...",B:"...",...}
        profile_labels,   // empty unless you attach them elsewhere
        // keep your other fields if you rely on them:
        // top_profile_code, top_profile_name, etc. (not included here to avoid guessing)
      },
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
