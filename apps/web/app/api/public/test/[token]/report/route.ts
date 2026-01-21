// apps/web/app/api/public/test/[token]/report/route.ts
/* eslint-disable no-console */
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { loadFrameworkBySlug, buildLookups, type FrequencyCode } from "@/lib/frameworks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- Types ---
type AB = "A" | "B" | "C" | "D";

type AnswerShape =
  | { question_id: string; value: number }
  | { question_id: string; index: number }
  | { question_id: string; selected: number }
  | { question_id: string; selected_index: number };

type MapEntry = { points: number; profile: string };

type QuestionMapRow = {
  id: string;
  profile_map: MapEntry[] | null;
  // Some orgs may store scoring here instead of profile_map
  weights: any | null;
};

type SubmissionRow = {
  id: string;
  taker_id: string;
  link_token: string | null;
  // IMPORTANT: totals shape varies by org/version:
  // - Legacy: { A,B,C,D, PROFILE_1..PROFILE_8, ... }
  // - Nested: { frequencies: {A..D}, profiles: {PROFILE_*}, meta: { wrapper_test_id, effective_test_id } }
  totals: any | null;
  answers_json: AnswerShape[] | null;
  created_at: string;
};

type LinkMeta = {
  test_id: string;
  org_slug: string | null;
  test_name: string | null;
  link_meta?: any | null;
};

type ReportFrameworkMeta = {
  bucket?: string;
  path?: string;
  version?: string;
};

type TestMeta = {
  orgSlug?: string;
  test?: string;
  frameworkKey?: string;
  frameworkType?: string;
  frequencies?: Array<{ code: AB; label: string }>;
  profiles?: Array<{ code: string; name: string; frequency?: AB; description?: string }>;
  reportFramework?: ReportFrameworkMeta;
};

type TestRow = {
  id: string;
  slug: string | null;
  name: string | null;
  meta: any | null;
};

type TakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

// ---------------- utils ----------------

function safeNumber(x: any, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function toPercentages<T extends string>(totals: Partial<Record<T, number>>): Record<T, number> {
  const vals = Object.values(totals || {}) as number[];
  const sum = vals.reduce((a, b) => a + (Number(b) || 0), 0);
  const out: Record<string, number> = {};
  for (const k of Object.keys(totals || {})) {
    const v = Number((totals as any)[k] || 0);
    out[k] = sum > 0 ? v / sum : 0;
  }
  return out as Record<T, number>;
}

function profileCodeToAB(pcode: string): AB | null {
  const pc = String(pcode || "").toUpperCase();
  const m = pc.match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n <= 2) return "A";
  if (n <= 4) return "B";
  if (n <= 6) return "C";
  return "D";
}

function selectedIndex(a: any): number {
  const v = a?.value != null ? Number(a.value) - 1 : undefined; // 1..N (1-based)
  const idx =
    v ??
    (a?.index != null ? Number(a.index) : undefined) ??
    (a?.selected != null ? Number(a.selected) : undefined) ??
    (a?.selected_index != null ? Number(a.selected_index) : undefined);

  return Math.max(0, safeNumber(idx, 0));
}

function coerceMapEntries(x: any): MapEntry[] {
  // We support a few shapes:
  // - profile_map: [{points, profile}, ...]
  // - weights: same array
  // - weights: { map: [...] } or { options: [...] }
  if (Array.isArray(x)) {
    return x
      .map((e) => ({
        points: safeNumber((e as any)?.points, 0),
        profile: String((e as any)?.profile || "").toUpperCase(),
      }))
      .filter((e) => e.points > 0 && !!e.profile);
  }

  if (x && typeof x === "object") {
    const maybe =
      (x as any)?.profile_map ||
      (x as any)?.weights ||
      (x as any)?.map ||
      (x as any)?.options ||
      null;
    if (Array.isArray(maybe)) return coerceMapEntries(maybe);
  }

  return [];
}

function computeFromAnswers(
  answers: AnswerShape[] | null | undefined,
  qmap: Map<string, QuestionMapRow>,
) {
  const freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
  const profileTotals: Record<string, number> = {};

  if (!Array.isArray(answers) || answers.length === 0) {
    return { freqTotals, profileTotals, used: "none" as const };
  }

  let usedAny = false;

  for (const a of answers) {
    const qid = (a as any)?.question_id;
    if (!qid) continue;

    const row = qmap.get(String(qid));
    if (!row) continue;

    // Prefer profile_map, but if missing, fall back to weights.
    const pm = coerceMapEntries(row.profile_map);
    const entries = pm.length > 0 ? pm : coerceMapEntries(row.weights);

    if (!Array.isArray(entries) || entries.length === 0) continue;

    const sel = selectedIndex(a);
    const entry = entries[sel];
    if (!entry) continue;

    const pts = safeNumber(entry.points, 0);
    const pcode = String(entry.profile || "").toUpperCase();
    if (pts <= 0 || !pcode) continue;

    usedAny = true;

    profileTotals[pcode] = (profileTotals[pcode] || 0) + pts;
    const ab = profileCodeToAB(pcode);
    if (ab) freqTotals[ab] = (freqTotals[ab] || 0) + pts;
  }

  return { freqTotals, profileTotals, used: usedAny ? ("qmap" as const) : ("none" as const) };
}

/**
 * Read saved totals from submission.totals, supporting BOTH shapes:
 *  - Legacy flat: totals.A / totals.PROFILE_1
 *  - Nested: totals.frequencies.A / totals.profiles.PROFILE_1
 */
function readSavedTotals(totals: any) {
  const raw = totals && typeof totals === "object" ? totals : {};

  const nestedFreq = raw?.frequencies && typeof raw.frequencies === "object" ? raw.frequencies : null;
  const nestedProfiles = raw?.profiles && typeof raw.profiles === "object" ? raw.profiles : null;

  // Frequencies
  const freqSrc = nestedFreq || raw;
  const freqTotals: Record<AB, number> = {
    A: safeNumber(freqSrc?.A, 0),
    B: safeNumber(freqSrc?.B, 0),
    C: safeNumber(freqSrc?.C, 0),
    D: safeNumber(freqSrc?.D, 0),
  };
  const freqSum = freqTotals.A + freqTotals.B + freqTotals.C + freqTotals.D;

  // Profiles
  const profSrc = nestedProfiles || raw;
  const profileTotals: Record<string, number> = {};
  for (const [k, v] of Object.entries(profSrc || {})) {
    const key = String(k || "").toUpperCase().trim();
    if (key.startsWith("PROFILE_")) profileTotals[key] = safeNumber(v, 0);
  }
  const profileSum = Object.values(profileTotals).reduce((a, b) => a + (Number(b) || 0), 0);

  // Meta (wrapper/effective)
  const meta = raw?.meta && typeof raw.meta === "object" ? raw.meta : null;
  const wrapper_test_id = typeof meta?.wrapper_test_id === "string" ? meta.wrapper_test_id : null;
  const effective_test_id = typeof meta?.effective_test_id === "string" ? meta.effective_test_id : null;

  return {
    freqTotals,
    freqSum,
    profileTotals,
    profileSum,
    wrapper_test_id,
    effective_test_id,
    shape: nestedFreq || nestedProfiles ? ("nested" as const) : ("flat" as const),
  };
}

// --- Supabase client (admin) ---
function sbAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("SUPABASE_URL is required (or NEXT_PUBLIC_SUPABASE_URL).");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required (or an anon key fallback).");

  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  });
}

// Resolve org/test for a token
async function resolveLinkMeta(token: string): Promise<LinkMeta | null> {
  const sb = sbAdmin();

  const link = await sb
    .from("test_links")
    .select("test_id, token, meta")
    .eq("token", token)
    .limit(1)
    .maybeSingle();

  if (link.error || !link.data?.test_id) return null;

  const vt = await sb
    .from("v_org_tests")
    .select("test_id, org_slug, test_name")
    .eq("test_id", link.data.test_id)
    .limit(1)
    .maybeSingle();

  if (vt.error) {
    return {
      test_id: link.data.test_id,
      org_slug: null,
      test_name: null,
      link_meta: (link.data as any)?.meta ?? null,
    };
  }

  return {
    test_id: vt.data?.test_id || link.data.test_id,
    org_slug: vt.data?.org_slug || null,
    test_name: vt.data?.test_name || null,
    link_meta: (link.data as any)?.meta ?? null,
  };
}

// Fetch latest submission for (taker_id, token)
// ✅ Accept legacy rows where link_token is NULL
async function fetchLatestSubmission(
  taker_id: string,
  token: string,
): Promise<{ row: SubmissionRow | null; matched: "token" | "null" | "none" }> {
  const sb = sbAdmin();

  const strict = await sb
    .from("test_submissions")
    .select("id, taker_id, link_token, totals, answers_json, created_at")
    .eq("taker_id", taker_id)
    .eq("link_token", token)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!strict.error && strict.data) return { row: strict.data as SubmissionRow, matched: "token" };

  const legacy = await sb
    .from("test_submissions")
    .select("id, taker_id, link_token, totals, answers_json, created_at")
    .eq("taker_id", taker_id)
    .is("link_token", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!legacy.error && legacy.data) return { row: legacy.data as SubmissionRow, matched: "null" };

  return { row: null, matched: "none" };
}

// Minimal questions map (id, profile_map, weights) for this test
async function fetchQuestionMaps(test_id: string): Promise<Map<string, QuestionMapRow>> {
  const sb = sbAdmin();

  const q = (await sb
    .from("test_questions")
    .select("id, profile_map, weights")
    .eq("test_id", test_id)
    .order("idx", { ascending: true })) as PostgrestSingleResponse<QuestionMapRow[]>;

  if (q.error || !Array.isArray(q.data)) return new Map();
  const map = new Map<string, QuestionMapRow>();
  for (const row of q.data) map.set(row.id, row);
  return map;
}

async function fetchTestRow(test_id: string): Promise<TestRow | null> {
  const sb = sbAdmin();
  const q = await sb
    .from("tests")
    .select("id, slug, name, meta")
    .eq("id", test_id)
    .maybeSingle();

  if (q.error || !q.data) return null;
  return q.data as TestRow;
}

async function fetchTakerRow(taker_id: string): Promise<TakerRow | null> {
  const sb = sbAdmin();
  const q = await sb
    .from("test_takers")
    .select("id, first_name, last_name")
    .eq("id", taker_id)
    .maybeSingle();

  if (q.error || !q.data) return null;
  return q.data as TakerRow;
}

async function downloadFrameworkJSON(bucket: string, path: string): Promise<any | null> {
  const sb = sbAdmin();
  const { data, error } = await sb.storage.from(bucket).download(path);

  if (error || !data) {
    console.log("Storage framework download failed:", { bucket, path, error: error?.message });
    return null;
  }

  const text = await data.text();
  try {
    return JSON.parse(text);
  } catch {
    console.log("Storage framework JSON parse failed:", { bucket, path });
    return null;
  }
}

// --- Support LEAD v1 schema ---

function pickCommonSections(frameworkJson: any): any[] | null {
  const fw = frameworkJson?.framework || frameworkJson;
  if (fw?.common?.sections && Array.isArray(fw.common.sections)) return fw.common.sections;
  if (fw?.framework?.common?.sections && Array.isArray(fw.framework.common.sections))
    return fw.framework.common.sections;
  return null;
}

function pickReportTitle(frameworkJson: any): string | null {
  const fw = frameworkJson?.framework || frameworkJson;
  return fw?.common?.report_title || fw?.report_title || null;
}

function findProfileReport(frameworkJson: any, profileCode: string) {
  const fw = frameworkJson?.framework || frameworkJson;
  const pc = String(profileCode || "").toUpperCase();

  // ✅ LEAD v1 schema: profiles: { PROFILE_1: { title, sections } }
  if (fw?.profiles && typeof fw.profiles === "object") {
    const hit = fw.profiles[pc];
    if (hit) return hit;
  }

  // older schema: reports_by_profile
  const reportsByProfile = fw?.reports_by_profile;
  if (reportsByProfile && typeof reportsByProfile === "object") {
    const hit = reportsByProfile[pc];
    if (hit) return hit;
  }

  // older schema: reports list
  const reports = fw?.reports;
  if (reports && typeof reports === "object") {
    for (const v of Object.values(reports)) {
      const p =
        (v as any)?.profile_code ||
        (v as any)?.profileCode ||
        (v as any)?.code ||
        "";
      if (String(p).toUpperCase() === pc) return v;
    }
  }

  return null;
}

// ---------------- Handler ----------------

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const token = params.token;
    const takerId = searchParams.get("tid");

    if (!takerId) {
      return NextResponse.json({ ok: false, error: "Missing tid" }, { status: 400 });
    }

    const meta = await resolveLinkMeta(token);
    if (!meta) {
      return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 404 });
    }

    const testRow = await fetchTestRow(meta.test_id);
    const testMeta = (testRow?.meta || {}) as TestMeta;

    // reportFramework meta (storage opt-in)
    const rf: ReportFrameworkMeta | null = (testRow?.meta as any)?.reportFramework || null;
    const useStorageFramework = Boolean(rf?.bucket && rf?.path);

    // Prefer v_org_tests org_slug, then tests.meta.orgSlug, then default
    const orgSlug = String(
      meta.org_slug || testMeta?.orgSlug || process.env.DEFAULT_ORG_SLUG || "competency-coach",
    ).trim();

    // Legacy framework by orgSlug (filesystem) — used for lookups + old orgs
    let fw: any = await loadFrameworkBySlug(orgSlug);
    let frameworkSource: "filesystem" | "storage" = "filesystem";

    // Storage override if enabled
    if (useStorageFramework && rf?.bucket && rf?.path) {
      const storageFw = await downloadFrameworkJSON(String(rf.bucket), String(rf.path));
      if (storageFw) {
        fw = storageFw;
        frameworkSource = "storage";
      }
    }

    const look = buildLookups(fw);

    // ✅ Labels: for LEAD use tests.meta first (Launch/Energise/Align/Discern + real profile names)
    const metaFreqs = Array.isArray(testMeta?.frequencies) ? testMeta.frequencies : null;
    const metaProfiles = Array.isArray(testMeta?.profiles) ? testMeta.profiles : null;

    const frequency_labels = (["A", "B", "C", "D"] as AB[]).map((code) => {
      const fromMeta = metaFreqs?.find((f) => f.code === code)?.label;
      const fromLegacy = look.freqByCode.get(code as FrequencyCode)?.name;
      return { code, name: fromMeta || fromLegacy || `Frequency ${code}` };
    });

    const profile_labels = Array.from({ length: 8 }).map((_, i) => {
      const n = i + 1;
      const code = `PROFILE_${n}`;
      const fromMeta = metaProfiles?.find((p) => String(p.code).toUpperCase() === code)?.name;
      const fromLegacy = look.profileByCode.get(code)?.name;
      return { code, name: fromMeta || fromLegacy || `Profile ${n}` };
    });

    const subRes = await fetchLatestSubmission(takerId, token);
    const sub = subRes.row;

    if (!sub) {
      return NextResponse.json(
        {
          ok: false,
          error: "Submission not found for this taker/token.",
          debug: {
            takerId,
            token,
            test_id: meta.test_id,
            note:
              "No submission matched link_token == token, and no legacy submission with link_token NULL was found for this taker.",
          },
        },
        { status: 404 },
      );
    }

    const taker = await fetchTakerRow(takerId);

    // Read saved totals (supports nested + flat)
    const savedRead = readSavedTotals(sub.totals);

    // 1) Prefer saved totals if present (most stable)
    // 2) If no saved totals, compute from answers + question maps (profile_map OR weights)
    //    NOTE: still fetch qmap for fallback/debug even if saved totals exist.
    const qmap = await fetchQuestionMaps(meta.test_id);
    const comp = computeFromAnswers(sub.answers_json, qmap);

    const freqTotals: Record<AB, number> = savedRead.freqSum > 0 ? savedRead.freqTotals : comp.freqTotals;

    const profileTotals: Record<string, number> =
      savedRead.profileSum > 0 ? savedRead.profileTotals : comp.profileTotals;

    const frequency_percentages = toPercentages<AB>(freqTotals);
    const profile_percentages = toPercentages<string>(profileTotals);

    // Determine top freq / profile
    const top_freq =
      (Object.entries(freqTotals) as [AB, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "A";

    const top_profile_entry =
      Object.entries(profileTotals).sort((a, b) => b[1] - a[1])[0] || ["PROFILE_1", 0];

    const top_profile_code = String(top_profile_entry[0] || "PROFILE_1").toUpperCase();
    const top_profile_name =
      profile_labels.find((p) => p.code === top_profile_code)?.name ||
      look.profileByCode.get(top_profile_code)?.name ||
      top_profile_code;

    // Storage sections payload (LEAD)
    let sections: any = null;
    if (useStorageFramework) {
      const common = pickCommonSections(fw) || [];
      const rep = findProfileReport(fw, top_profile_code);

      const profileSections = rep?.sections;
      const profileArr = Array.isArray(profileSections) ? profileSections : [];

      sections = {
        common,
        profile: profileArr,
        report_title: rep?.title || pickReportTitle(fw) || null,
        profile_missing: profileArr.length === 0,
        framework_version: rf?.version || null,
        framework_bucket: rf?.bucket || null,
        framework_path: rf?.path || null,
      };
    }

    // Link meta (show_results etc) – prefer stored test_links.meta if present
    const linkMeta = meta.link_meta || null;

    // Strong debug signal when scores are zero because qmap missing
    const answersCount = Array.isArray(sub.answers_json) ? sub.answers_json.length : 0;
    const computedSum = Object.values(profileTotals || {}).reduce((a, b) => a + (Number(b) || 0), 0);

    const scoringWarning =
      savedRead.freqSum <= 0 &&
      savedRead.profileSum <= 0 &&
      (qmap.size === 0 || comp.used === "none") &&
      answersCount > 0 &&
      computedSum === 0
        ? "Scores are zero because no question scoring map was found for this test_id (test_questions missing, or no profile_map/weights set)."
        : null;

    return NextResponse.json({
      ok: true,
      data: {
        org_slug: orgSlug,
        org_name: null,
        test_name: meta.test_name || testRow?.name || testMeta?.test || "Profile Test",

        taker: {
          id: takerId,
          first_name: taker?.first_name ?? null,
          last_name: taker?.last_name ?? null,
        },

        link: linkMeta || undefined,

        frequency_labels,
        frequency_totals: freqTotals,
        frequency_percentages,

        profile_labels,
        profile_totals: profileTotals,
        profile_percentages,

        top_freq,
        top_profile_code,
        top_profile_name,

        sections,

        debug: {
          frameworkSource,
          reportFramework: rf,
          useStorageFramework,
          schema: "portal",
          test_id: meta.test_id,
          submission_id: sub.id,
          submission_link_token: sub.link_token,
          submission_match: subRes.matched,
          qmap_size: qmap.size,
          answers_count: answersCount,

          // ✅ New: totals diagnostics
          totals_shape: savedRead.shape,
          wrapper_test_id: savedRead.wrapper_test_id,
          effective_test_id: savedRead.effective_test_id,

          used_saved_profiles: savedRead.profileSum > 0,
          used_saved_frequencies: savedRead.freqSum > 0,
          computed_from_qmap: comp.used,
          scoring_warning: scoringWarning,
        },

        version: useStorageFramework ? "portal-v2-storage-optin" : "portal-v1",
      },
    });
  } catch (e: any) {
    console.error("report route error:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
