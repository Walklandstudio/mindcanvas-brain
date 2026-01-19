// apps/web/app/api/public/test/[token]/report/route.ts
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
  link_meta?: any | null; // stored link meta (show_results etc)
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

  // optional convenience fields you may add later:
  next_steps_url?: string;
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

function normaliseKey(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function slugifyName(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

// --- Extractors (robust) ---

function pickFrameworkRoot(frameworkJson: any) {
  // support either raw or wrapped
  return frameworkJson?.framework ?? frameworkJson ?? null;
}

function pickCommonSections(frameworkJson: any): any[] | null {
  const fw = pickFrameworkRoot(frameworkJson);
  if (!fw) return null;

  // Most common (your LEAD v1): fw.common.sections = [...]
  if (fw?.common?.sections && Array.isArray(fw.common.sections)) return fw.common.sections;

  // Some variants: fw.common = [...]
  if (fw?.common && Array.isArray(fw.common)) return fw.common;

  // Rare: fw.sections.common = [...]
  if (fw?.sections?.common && Array.isArray(fw.sections.common)) return fw.sections.common;

  return null;
}

function pickReportTitle(frameworkJson: any): string | null {
  const fw = pickFrameworkRoot(frameworkJson);
  if (!fw) return null;

  return (
    fw?.common?.report_title ||
    fw?.common?.reportTitle ||
    fw?.report_title ||
    fw?.reportTitle ||
    null
  );
}

function pickFrameworkNextStepsUrl(frameworkJson: any): string | null {
  const fw = pickFrameworkRoot(frameworkJson);
  if (!fw) return null;

  const url =
    fw?.common?.next_steps_url ||
    fw?.common?.nextStepsUrl ||
    fw?.next_steps_url ||
    fw?.nextStepsUrl ||
    null;

  return typeof url === "string" && url.trim() ? url.trim() : null;
}

function findProfileReport(frameworkJson: any, profileCode: string, profileName?: string | null) {
  const fw = pickFrameworkRoot(frameworkJson);
  if (!fw) return null;

  const pc = String(profileCode || "").toUpperCase().trim();
  const pnSlug = slugifyName(profileName || "");

  // 1) YOUR LEAD v1 likely: fw.profiles is an object keyed by PROFILE_1..PROFILE_8 (or by name)
  if (fw?.profiles && typeof fw.profiles === "object" && !Array.isArray(fw.profiles)) {
    // exact hit
    if (fw.profiles[pc]) return fw.profiles[pc];

    // case-insensitive / dash-normalised key match
    const entries = Object.entries(fw.profiles);
    const hitByKey = entries.find(([k]) => String(k).toUpperCase() === pc);
    if (hitByKey?.[1]) return hitByKey[1];

    // try by slugged profile name key (trailblazer, spark, etc.)
    if (pnSlug) {
      const byNameKey = entries.find(([k]) => slugifyName(k) === pnSlug);
      if (byNameKey?.[1]) return byNameKey[1];
    }
  }

  // 2) fw.profiles could be an array of { code/name, sections }
  if (Array.isArray(fw?.profiles)) {
    const byCode = fw.profiles.find((p: any) => String(p?.code || p?.profile_code || "").toUpperCase() === pc);
    if (byCode) return byCode;

    if (pnSlug) {
      const byName = fw.profiles.find((p: any) => slugifyName(p?.name) === pnSlug);
      if (byName) return byName;
    }
  }

  // 3) older schema: reports_by_profile
  const reportsByProfile = fw?.reports_by_profile;
  if (reportsByProfile && typeof reportsByProfile === "object") {
    if (reportsByProfile[pc]) return reportsByProfile[pc];

    const hit = Object.entries(reportsByProfile).find(([k]) => String(k).toUpperCase() === pc);
    if (hit?.[1]) return hit[1];

    if (pnSlug) {
      const byName = Object.entries(reportsByProfile).find(([k]) => slugifyName(k) === pnSlug);
      if (byName?.[1]) return byName[1];
    }
  }

  // 4) older schema: fw.reports object/list
  const reports = fw?.reports;
  if (reports && typeof reports === "object") {
    for (const v of Object.values(reports)) {
      const p =
        (v as any)?.profile_code ||
        (v as any)?.profileCode ||
        (v as any)?.code ||
        "";
      if (String(p).toUpperCase() === pc) return v;

      if (pnSlug) {
        const name = (v as any)?.name || (v as any)?.title || "";
        if (slugifyName(name) === pnSlug) return v;
      }
    }
  }

  // 5) sometimes nested: fw.profile_reports
  const pr = fw?.profile_reports;
  if (pr && typeof pr === "object" && !Array.isArray(pr)) {
    if (pr[pc]) return pr[pc];
    const hit = Object.entries(pr).find(([k]) => String(k).toUpperCase() === pc);
    if (hit?.[1]) return hit[1];
    if (pnSlug) {
      const byName = Object.entries(pr).find(([k]) => slugifyName(k) === pnSlug);
      if (byName?.[1]) return byName[1];
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

    // storage framework definition from tests.meta.reportFramework
    const rf: ReportFrameworkMeta | null = (testRow?.meta as any)?.reportFramework || null;
    const useStorageFramework = Boolean(rf?.bucket && rf?.path);

    // org slug priority
    const orgSlug = String(
      meta.org_slug || testMeta?.orgSlug || process.env.DEFAULT_ORG_SLUG || "competency-coach",
    ).trim();

    // legacy framework by orgSlug (unchanged)
    let fw: any = await loadFrameworkBySlug(orgSlug);
    let frameworkSource: "filesystem" | "storage" = "filesystem";

    // opt-in storage override
    if (useStorageFramework && rf?.bucket && rf?.path) {
      const storageFw = await downloadFrameworkJSON(String(rf.bucket), String(rf.path));
      if (storageFw) {
        fw = storageFw;
        frameworkSource = "storage";
      } else {
        // keep filesystem fallback
        frameworkSource = "filesystem";
      }
    }

    // Lookups for legacy tests
    const look = buildLookups(fw);

    // labels: prefer tests.meta for LEAD
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

    const sub = await fetchLatestSubmission(takerId, token);
    if (!sub) {
      return NextResponse.json(
        { ok: false, error: "Submission not found for this taker/token." },
        { status: 404 },
      );
    }

    const taker = await fetchTakerRow(takerId);

    const qmap = await fetchQuestionMaps(meta.test_id);
    const comp = computeFromAnswers(sub.answers_json, qmap);

    const saved = (sub.totals || {}) as Record<string, number>;
    const savedSum = Object.values(saved).reduce((a, b) => a + (Number(b) || 0), 0);

    const freqTotals: Record<AB, number> =
      savedSum > 0
        ? {
            A: safeNumber(saved.A, 0),
            B: safeNumber(saved.B, 0),
            C: safeNumber(saved.C, 0),
            D: safeNumber(saved.D, 0),
          }
        : comp.freqTotals;

    const profileTotals = comp.profileTotals;

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

    // Storage sections payload (LEAD)
    let sections: any = null;
    let report_title: string | null = null;

    if (useStorageFramework) {
      const common = pickCommonSections(fw);
      const rep = findProfileReport(fw, top_profile_code, top_profile_name);

      const profileSections = rep?.sections || rep?.content || null; // allow alt key
      const profileMissing = !Array.isArray(profileSections) || profileSections.length === 0;

      report_title = rep?.title || rep?.report_title || pickReportTitle(fw) || null;

      // IMPORTANT: keep sections grouped as arrays (your renderer expects groups)
      sections = {
        common: common || null,
        profile: profileMissing ? null : profileSections,
      };

      // Helpful debugging (doesn't break UI)
      (sections as any).__meta = {
        profile_missing: profileMissing,
        framework_version: rf?.version || null,
        framework_bucket: rf?.bucket || null,
        framework_path: rf?.path || null,
        resolved_profile_code: top_profile_code,
        resolved_profile_name: top_profile_name,
      };
    }

    // Link meta: prefer test_links.meta if present
    const linkMeta = meta.link_meta || null;

    // Next steps fallback chain
    const nextStepsFallback =
      (typeof linkMeta?.next_steps_url === "string" && linkMeta.next_steps_url.trim()) ||
      (typeof (testRow?.meta as any)?.next_steps_url === "string" && (testRow?.meta as any).next_steps_url.trim()) ||
      pickFrameworkNextStepsUrl(fw) ||
      "";

    const mergedLink =
      linkMeta || nextStepsFallback
        ? {
            ...(linkMeta || {}),
            next_steps_url: nextStepsFallback || (linkMeta?.next_steps_url ?? null),
          }
        : undefined;

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

        link: mergedLink,

        frequency_labels,
        frequency_totals: freqTotals,
        frequency_percentages,

        profile_labels,
        profile_totals: profileTotals,
        profile_percentages,

        top_freq,
        top_profile_code,
        top_profile_name,

        // keep existing field
        sections,

        // optional: sometimes nice for clients to use directly
        report_title,

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



