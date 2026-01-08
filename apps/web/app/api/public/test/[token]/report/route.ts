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
  const m = String(pcode || "").toUpperCase().match(/^P(?:ROFILE)?[_\s-]?([1-8])$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n <= 2) return "A";
  if (n <= 4) return "B";
  if (n <= 6) return "C";
  return "D";
}

function selectedIndex(a: any): number {
  const v = a?.value != null ? Number(a.value) - 1 : undefined; // 1..N
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
  const profileTotals: Record<string, number> = {};

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
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "portal" }, // ✅ REQUIRED (otherwise you read public.*)
  });
}

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

function findReportForProfile(frameworkJson: any, profileCode: string) {
  const fw = frameworkJson?.framework || frameworkJson;
  if (!fw) return null;

  const reportsByProfile = fw?.reports_by_profile;
  if (reportsByProfile && typeof reportsByProfile === "object") {
    const hit = reportsByProfile[String(profileCode).toUpperCase()];
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

    const meta = await resolveLinkMeta(token);
    if (!meta) {
      return NextResponse.json({ ok: false, error: "Invalid or expired link" }, { status: 404 });
    }

    const testRow = await fetchTestRow(meta.test_id);
    const rf: ReportFrameworkMeta | null = (testRow?.meta as any)?.reportFramework || null;
    const useStorageFramework = Boolean(rf?.bucket && rf?.path);

    const orgSlug = (meta.org_slug || process.env.DEFAULT_ORG_SLUG || "competency-coach").trim();

    // legacy framework by orgSlug (unchanged)
    let fw: any = await loadFrameworkBySlug(orgSlug);
    let frameworkSource: "filesystem" | "storage" = "filesystem";

    // opt-in storage override
    if (useStorageFramework && rf?.bucket && rf?.path) {
      const storageFw = await downloadFrameworkJSON(String(rf.bucket), String(rf.path));
      if (storageFw) {
        fw = storageFw;
        frameworkSource = "storage";
      }
    }

    const look = buildLookups(fw);

    const frequency_labels = (["A", "B", "C", "D"] as AB[]).map((code) => ({
      code,
      name: look.freqByCode.get(code as FrequencyCode)?.name || `Frequency ${code}`,
    }));

    const profile_labels = Array.from({ length: 8 }).map((_, i) => {
      const n = i + 1;
      const code = `PROFILE_${n}`;
      const jsonName = look.profileByCode.get(code)?.name || null;
      return { code, name: jsonName || `Profile ${n}` };
    });

    const sub = await fetchLatestSubmission(takerId, token);
    if (!sub) {
      return NextResponse.json(
        { ok: false, error: "Submission not found for this taker/token." },
        { status: 404 }
      );
    }

    let freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
    let profileTotals: Record<string, number> = {};

    const saved = (sub.totals || {}) as Record<string, number>;
    const savedSum = Object.values(saved).reduce((a, b) => a + (Number(b) || 0), 0);

    const qmap = await fetchQuestionMaps(meta.test_id);
    const comp = computeFromAnswers(sub.answers_json, qmap);
    profileTotals = comp.profileTotals;

    if (savedSum > 0) {
      freqTotals = {
        A: safeNumber(saved.A, 0),
        B: safeNumber(saved.B, 0),
        C: safeNumber(saved.C, 0),
        D: safeNumber(saved.D, 0),
      };
    } else {
      freqTotals = comp.freqTotals;
    }

    const frequency_percentages = toPercentages<AB>(freqTotals);
    const profile_percentages = toPercentages<string>(profileTotals);

    const top_freq =
      (Object.entries(freqTotals) as [AB, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "A";

    const top_profile_entry =
      Object.entries(profileTotals).sort((a, b) => b[1] - a[1])[0] || ["PROFILE_1", 0];

    const top_profile_code = top_profile_entry[0];
    const top_profile_name =
      profile_labels.find((p) => p.code === top_profile_code)?.name ||
      look.profileByCode.get(top_profile_code)?.name ||
      top_profile_code;

    let sections: any = null;
    if (useStorageFramework && top_profile_code) {
      const common =
        fw?.framework?.common?.sections ||
        fw?.common?.sections ||
        null;

      const rep = findReportForProfile(fw, top_profile_code);

      sections = {
        common,
        profile: rep?.sections || null,
        report_title: rep?.title || null,
        framework_version: rf?.version || null,
        framework_bucket: rf?.bucket || null,
        framework_path: rf?.path || null,
      };
    }

    return NextResponse.json({
      ok: true,
      data: {
        org_slug: orgSlug,
        test_name: meta.test_name || testRow?.name || "Profile Test",
        taker: { id: takerId },

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

        // ✅ debug (remove later)
        debug: {
          frameworkSource,
          reportFramework: rf,
          useStorageFramework,
          schema: "portal",
        },

        version: useStorageFramework ? "portal-v2-storage-optin" : "portal-v1",
      },
    });
  } catch (e: any) {
    console.error("report route error:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
