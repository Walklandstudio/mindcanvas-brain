// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AB = "A" | "B" | "C" | "D";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

/** ---- ORG MAPPINGS (server-safe, no schema changes) ---- */
// Team Puzzle: PROFILE_1..8 -> A..D (from your JSON)
const TP_PROFILE_TO_FREQ: Record<string, AB> = {
  PROFILE_1: "A", PROFILE_2: "A",
  PROFILE_3: "B", PROFILE_4: "B",
  PROFILE_5: "C", PROFILE_6: "C",
  PROFILE_7: "D", PROFILE_8: "D",
};

// Competency Coach: P1..P8 -> A..D (your signature mapping)
const CC_PROFILE_TO_FREQ: Record<string, AB> = {
  P1: "A", P2: "A",
  P3: "B", P4: "B",
  P5: "C", P6: "C",
  P7: "D", P8: "D",
};

/** Normalize common profile code shapes to a canonical code */
function normProfileCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^P\d+$/i.test(s)) return s.toUpperCase();                // "P1"
  if (/^PROFILE[_\s-]?(\d+)$/i.test(s)) return `PROFILE_${RegExp.$1}`.toUpperCase(); // "PROFILE_1"
  const m = s.match(/^(\d+)$/);
  if (m) return `P${m[1]}`;                                      // "1" -> "P1"
  return s;                                                       // fallback (name)
}

/** Safely add to A/B/C/D */
function addFreq(freqTotals: Record<AB, number>, f: AB | null, pts: number) {
  if (!f) return;
  freqTotals[f] = (freqTotals[f] || 0) + (Number(pts) || 0);
}

/** Try to map profile code to A/B/C/D using org mappings */
function profileToFreq(orgSlug: string, codeOrName: string): AB | null {
  const code = normProfileCode(codeOrName);
  if (!code) return null;
  if (orgSlug === "team-puzzle" && TP_PROFILE_TO_FREQ[code as keyof typeof TP_PROFILE_TO_FREQ]) {
    return TP_PROFILE_TO_FREQ[code as keyof typeof TP_PROFILE_TO_FREQ];
  }
  if (orgSlug === "competency-coach") {
    // accept both "P1" and names that normalize to P#
    const asP = /^PROFILE_(\d+)$/i.test(code) ? (`P${RegExp.$1}`) : code;
    if (CC_PROFILE_TO_FREQ[asP as keyof typeof CC_PROFILE_TO_FREQ]) {
      return CC_PROFILE_TO_FREQ[asP as keyof typeof CC_PROFILE_TO_FREQ];
    }
  }
  return null;
}

/** Derive frequency totals from answers when client didn't send totals */
function deriveTotalsFromAnswers(
  answers: any,
  orgSlug: string
): Record<AB, number> {
  const freq: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
  const rows: any[] = Array.isArray(answers) ? answers : answers?.rows || answers?.items || [];
  for (const row of rows) {
    // Case 1: options[] with selected index
    if (Array.isArray(row?.options) && (row?.selected != null || row?.selected_index != null)) {
      const idx = Number(row.selected ?? row.selected_index);
      const opt = row.options[idx];
      if (opt) {
        const pts = Number(opt.points ?? opt.score ?? 0) || 0;
        const prof = normProfileCode(opt.profile ?? opt.code ?? opt.id ?? null);
        // prefer explicit option.frequency if present
        const f: AB | null = (opt.frequency as AB) || profileToFreq(orgSlug, prof || "");
        addFreq(freq, f, pts);
      }
      continue;
    }
    // Case 2: selected object
    if (row?.selected && typeof row.selected === "object") {
      const pts = Number(row.selected.points ?? row.selected.score ?? 0) || 0;
      const prof = normProfileCode(row.selected.profile ?? row.selected.code ?? row.selected.id ?? null);
      const f: AB | null = (row.selected.frequency as AB) || profileToFreq(orgSlug, prof || "");
      addFreq(freq, f, pts);
      continue;
    }
    // Case 3: value object
    if (row?.value && typeof row.value === "object") {
      const pts = Number(row.value.points ?? row.value.score ?? 0) || 0;
      const prof = normProfileCode(row.value.profile ?? row.value.code ?? row.value.id ?? null);
      const f: AB | null = (row.value.frequency as AB) || profileToFreq(orgSlug, prof || "");
      addFreq(freq, f, pts);
      continue;
    }
    // Case 4: direct profile & points
    if (row?.profile || row?.code || row?.id) {
      const pts = Number(row.points ?? row.score ?? 0) || 0;
      const prof = normProfileCode(row.profile ?? row.code ?? row.id ?? null);
      const f: AB | null = profileToFreq(orgSlug, prof || "");
      addFreq(freq, f, pts);
    }
  }
  return freq;
}

function sumABCD(t: Partial<Record<AB, number>> | undefined | null) {
  if (!t) return 0;
  return (Number(t.A||0)+Number(t.B||0)+Number(t.C||0)+Number(t.D||0));
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const takerId: string | undefined = body.taker_id || body.takerId || body.tid;
    if (!takerId) return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });

    const answers_json = body.answers ?? null;
    let totals: Partial<Record<AB, number>> = body.frequency_totals ?? body.totals ?? {};

    const sb = supa();

    // Resolve taker + org via the link
    const { data: taker } = await sb
      .from("test_takers")
      .select("id, test_id, link_token, first_name, last_name, email, company, role_title")
      .eq("id", takerId).eq("link_token", token).maybeSingle();

    if (!taker) {
      return NextResponse.json({ ok: false, error: "Taker not found for this token" }, { status: 404 });
    }

    // Find org slug for mapping (from link + view)
    const { data: link } = await sb
      .from("test_links")
      .select("org_id, org_slug")
      .eq("token", token)
      .maybeSingle();

    let orgSlug = (link as any)?.org_slug || "competency-coach";
    if (!link?.org_slug && link?.org_id) {
      const { data: orgView } = await sb
        .from("v_organizations" as any)
        .select("slug")
        .eq("id", link.org_id)
        .maybeSingle();
      if (orgView?.slug) orgSlug = orgView.slug;
    }

    // If totals missing/empty, derive from answers_json using org mapping
    if (sumABCD(totals) <= 0) {
      totals = deriveTotalsFromAnswers(answers_json, orgSlug);
    }

    // Snapshot submission (write the correct column: totals)
    const submissionPayload = {
      taker_id: taker.id,
      test_id: taker.test_id,
      link_token: token,
      totals: {
        A: Number(totals.A||0),
        B: Number(totals.B||0),
        C: Number(totals.C||0),
        D: Number(totals.D||0),
      },
      answers_json,
      first_name: taker.first_name ?? null,
      last_name: taker.last_name ?? null,
      email: taker.email ?? null,
      company: taker.company ?? null,
      role_title: taker.role_title ?? null,
    };

    const { error: subErr } = await sb.from("test_submissions").insert(submissionPayload);
    if (subErr) {
      return NextResponse.json({ ok: false, error: `Submission insert failed: ${subErr.message}` }, { status: 500 });
    }

    // Upsert results (preferred source for report)
    const { error: resErr } = await sb
      .from("test_results")
      .upsert({
        taker_id: taker.id,
        totals: submissionPayload.totals,
      }, { onConflict: "taker_id" });

    if (resErr) {
      // Non-fatal; report will fall back to submissions
      console.warn("test_results upsert failed", resErr.message);
    }

    // Mark taker completed
    await sb.from("test_takers").update({ status: "completed" })
      .eq("id", taker.id).eq("link_token", token);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
