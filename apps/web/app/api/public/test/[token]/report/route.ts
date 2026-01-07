/* eslint-disable no-console */
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { loadFrameworkBySlug, buildLookups, type FrequencyCode } from "@/lib/frameworks";

// --- Types ---
type AB = "A" | "B" | "C" | "D";

type AnswerShape =
  | { question_id: string; value: number }
  | { question_id: string; index: number }
  | { question_id: string; selected: number }
  | { question_id: string; selected_index: number };

type QuestionMapRow = {
  id: string;
  profile_map: Array<{ points: number; profile: string }> | null;
};

type SubmissionRow = {
  id: string;
  taker_id: string;
  link_token: string | null;
  totals: Record<string, number> | null;
  answers_json: AnswerShape[] | null;
  created_at: string;
};

type LinkMeta = {
  test_id: string;
  org_slug: string | null;
  test_name: string | null;
};

type ReportFrameworkMeta = {
  bucket?: string;
  path?: string;
  version?: string;
};

type TestRow = {
  id: string;
  slug: string | null;
  name: string | null;
  meta: any | null;
};

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
  // Accept "PROFILE_1" .. "PROFILE_8" (case-insensitive); derive A/B/C/D groups 1-2=A, 3-4=B, 5-6=C, 7-8=D
  const m = String(pcode || "").toUpperCase().match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n <= 2) return "A";
  if (n <= 4) return "B";
  if (n <= 6) return "C";
  return "D";
}

// Pulls 0-based selected option index from any of our client shapes
function selectedIndex(a: any): number {
  const v = a?.value != null ? Number(a.value) - 1 : undefined; // common case: 1..N
  const idx =
    v ??
    (a?.index != null ? Number(a.index) : undefined) ??
    (a?.selected != null ? Number(a.selected) : undefined) ??
    (a?.selected_index != null ? Number(a.selected_index) : undefined);
  return Math.max(0, safeNumber(idx, 0));
}

function computeFromAnswers(
  answers: AnswerShape[] | null | undefined,
  qmap: Map<string, QuestionMapRow>,
) {
  const freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
  const profileTotals: Record<string, number> = {}; // PROFILE_1..PROFILE_8

  if (!Array.isArray(answers) || answers.length === 0) {
    return { freqTotals, profileTotals };
  }

  for (const a of answers) {
    const qid = (a as any)?.question_id;
    if (!qid) continue;

    const row = qmap.get(String(qid));
    const pm = row?.profile_map;
    if (!Array.isArray(pm) || pm.length === 0) continue;

    const sel = selectedIndex(a);
    const entry = pm[sel];
    if (!entry) continue;

    const pts = safeNumber(entry.points, 0);
    const pcode = String(entry.profile || "").toUpperCase();

    if (pts <= 0 || !pcode) continue;

    profileTotals[pcode] = (profileTotals[pcode] || 0) + pts;

    const ab = profileCodeToAB(pcode);
    if (ab) freqTotals[ab] = (freqTotals[ab] || 0) + pts;
  }

  return { freqTotals, profileTotals };
}

// --- Supabase client (admin) ---
function sbAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Resolve org/test for a token
async function resolveLinkMeta(token: string): Promise<LinkMeta | null> {
  const sb = sbAdmin();

  const link = await sb
    .from("test_links")
    .select("test_id, token")
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
    return { test_id: link.data.test_id, org_slug: null, test_name: null };
  }
  return {
    test_id: vt.data?.test_id || link.data.test_id,
    org_slug: vt.data?.org_slug || null,
    test_name: vt.data?.test_name || null,
  };
}

// Fetch latest submission for (taker_id, token)
async function fetchLatestSubmission(taker_id: string, token: string): Promise<SubmissionRow | null> {
  const sb = sbAdmin();
  const q = await sb
    .from("test_submissions")
    .select("id, taker_id, link_token, totals, answers_json, created_at")
    .eq("taker_id", taker_id)
    .eq("link_token", token)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (q.error || !q.data) return null;
  return q.data as SubmissionRow;
}

// Minimal questions map (id, profile_map) for this test
async function fetchQuestionMaps(test_id: string): Promise<Map<string, QuestionMapRow>> {
  const sb = sbAdmin();
  const q = (await sb
    .from("test_questions")
    .select("id, profile_map")
    .eq("test_id", test_id)
    .in("category", ["scored", null])
    .order("idx", { ascending: true })) as PostgrestSingleResponse<QuestionMapRow[]>;

  if (q.error || !Array.isArray(q.data)) return new Map();
  const map = new Map<string, QuestionMapRow>();
  for (const row of q.data) map.set(row.id, row);
  return map;
}

// NEW: fetch test meta (for Storage framework opt-in)
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

// NEW: labels from DB (used for new tests; old tests can still fall back to JSON)
async function fetchFrequencyLabels(test_id: string): Promise<Map<AB, string>> {
  const sb = sbAdmin();
  const q = await sb
    .from("test_frequency_labels")
    .select("frequency_code, frequency_name")
    .eq("test_id", test_id);

  const map = new Map<AB, string>();
  for (const r of q.data || []) {
    const code = String((r as any).frequency_code || "").toUpperCase();
    const name = String((r as any).frequency_name || "");
    if (["A", "B", "C", "D"].includes(code) && name) map.set(code as AB, name);
  }
  return map;
}

async function fetchProfileLabels(test_id: string): Promise<Map<string, string>> {
  const sb = sbAdmin();
  const q = await sb
    .from("test_profile_labels")
    .select("profile_code, label")
    .eq("test_id", test_id);

  const map = new Map<string, string>();
  for (const r of q.data || []) {
    const code = String((r as any).profile_code || "").toUpperCase();
    const name = String((r as any).label || "");
    if (code && name) map.set(code, name);
  }
  return map;
}

// NEW: download framework JSON from Supabase Storage
async function downloadFrameworkJSON(bucket: string, path: string): Promise<any | null> {
  const sb = sbAdmin();
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error || !data) return null;
  const text = await data.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// NEW: find report for a profile code inside framework JSON
function findReportForProfile(frameworkJson: any, profileCode: string) {
  const fw = frameworkJson?.framework || frameworkJson;
  if (!fw) return null;

  // optional fast-path
  const byProfile = fw?.reports_by_profile;
  if (byProfile && typeof byProfile === "object") {
    const hit = byProfile[String(profileCode).toUpperCase()];
    if (hit) return hit;
  }

  const reports = fw?.reports;
  if (reports && typeof reports === "object") {
    for (const v of Object.values(reports)) {
      const pc = (v as any)?.profile_code || (v as any)?.profileCode || "";
      if (String(pc).toUpperCase() === String(profileCode).toUpperCase()) return v;
    }
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const token = params.token;
    const takerId = searchParams.get("tid");

    if (!takerId) {
      return NextResponse.json({ ok: false, error: "Missing tid" }, { status: 400 });
    }

    // 1) Resolve org/test by token
    const meta = await resolveLinkMeta(token);
    if (!meta) {
      return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 404 });
    }

    // NEW: read test meta (opt-in for Storage framework)
    const testRow = await fetchTestRow(meta.test_id);
    const rf: ReportFrameworkMeta | null = (testRow?.meta as any)?.reportFramework || null;
    const hasStorageFramework = Boolean(rf?.bucket && rf?.path);

    // 2) Legacy behavior: load framework labels by org_slug (filesystem JSON)
    //    This remains the default for Team Puzzle / Competency Coach.
    const orgSlug = (meta.org_slug || process.env.DEFAULT_ORG_SLUG || "competency-coach").trim();
    const legacyFw = await loadFrameworkBySlug(orgSlug);
    const legacyLook = buildLookups(legacyFw);

    // NEW: For new tests, we prefer DB labels; for old tests, legacy JSON labels remain unchanged.
    const dbFreq = hasStorageFramework ? await fetchFrequencyLabels(meta.test_id) : new Map<AB, string>();
    const dbProfiles = hasStorageFramework ? await fetchProfileLabels(meta.test_id) : new Map<string, string>();

    // frequency labels (A..D)
    const frequency_labels = (["A", "B", "C", "D"] as AB[]).map((code) => {
      const fromDb = dbFreq.get(code);
      if (fromDb) return { code, name: fromDb };

      // fallback legacy json
      return {
        code,
        name: legacyLook.freqByCode.get(code as FrequencyCode)?.name || `Frequency ${code}`,
      };
    });

    // profile labels (PROFILE_1..PROFILE_8)
    const profile_labels = Array.from({ length: 8 }).map((_, i) => {
      const n = i + 1;
      const code = `PROFILE_${n}`;
      const fromDb = dbProfiles.get(code);
      if (fromDb) return { code, name: fromDb };

      const jsonName = legacyLook.profileByCode.get(code)?.name || null;
      return { code, name: jsonName || `Profile ${n}` };
    });

    // 3) Latest submission for this taker+token
    const sub = await fetchLatestSubmission(takerId, token);
    if (!sub) {
      return NextResponse.json(
        { ok: false, error: "Submission not found for this taker/token." },
        { status: 404 }
      );
    }

    let freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
    let profileTotals: Record<string, number> = {};

    // Prefer saved totals if they’re non-zero
    const saved = (sub.totals || {}) as Record<string, number>;
    const savedSum = Object.values(saved).reduce((a, b) => a + (Number(b) || 0), 0);

    if (savedSum > 0) {
      // Trust DB totals for frequency
      freqTotals = {
        A: safeNumber(saved.A, 0),
        B: safeNumber(saved.B, 0),
        C: safeNumber(saved.C, 0),
        D: safeNumber(saved.D, 0),
      };
      // Profile totals: derive on the fly from answers + profile_map
      const qmap = await fetchQuestionMaps(meta.test_id);
      const comp = computeFromAnswers(sub.answers_json, qmap);
      profileTotals = comp.profileTotals;
    } else {
      // Compute both mixes from answers_json and profile_map
      const qmap = await fetchQuestionMaps(meta.test_id);
      const comp = computeFromAnswers(sub.answers_json, qmap);
      freqTotals = comp.freqTotals;
      profileTotals = comp.profileTotals;
    }

    // 4) Percentages
    const frequency_percentages = toPercentages<AB>(freqTotals);
    const profile_percentages = toPercentages<string>(profileTotals);

    // 5) Top findings
    const top_freq =
      (Object.entries(freqTotals) as [AB, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "A";

    const top_profile_entry =
      Object.entries(profileTotals).sort((a, b) => b[1] - a[1])[0] || ["PROFILE_1", 0];

    const top_profile_code = top_profile_entry[0];
    const top_profile_name =
      profile_labels.find((p) => p.code === top_profile_code)?.name ||
      legacyLook.profileByCode.get(top_profile_code)?.name ||
      top_profile_code;

    /**
     * ✅ NEW STANDARD (OPT-IN):
     * If test.meta.reportFramework exists, attach dynamic report sections from Supabase Storage.
     * Otherwise, return the legacy payload unchanged.
     */
    let sections: any = null;
    if (hasStorageFramework && rf?.bucket && rf?.path) {
      const fwJson = await downloadFrameworkJSON(String(rf.bucket), String(rf.path));

      if (fwJson) {
        const common =
          fwJson?.framework?.common?.sections ||
          fwJson?.common?.sections ||
          null;

        const report = findReportForProfile(fwJson, top_profile_code);

        sections = {
          common,
          profile: report?.sections || null,
          report_title: report?.title || null,
          framework_version: rf?.version || null,
          framework_bucket: rf.bucket,
          framework_path: rf.path,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        org_slug: orgSlug,
        test_name: meta.test_name || testRow?.name || "Profile Test",
        taker: { id: takerId },

        // frequency mix
        frequency_labels,
        frequency_totals: freqTotals,
        frequency_percentages,

        // profile mix
        profile_labels,
        profile_totals: profileTotals,
        profile_percentages,

        // top picks
        top_freq,
        top_profile_code,
        top_profile_name,

        // NEW (only for tests that opt-in)
        sections,

        version: "portal-v2-storage-optin",
      },
    });
  } catch (e: any) {
    console.error("report route error:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
