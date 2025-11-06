
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

type KV = { key: string; value: number };
type DashboardPayload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}
function serverError(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

/** Pick “best guess” label/value columns if the view doesn’t expose standard names. */
function pickCols(sample: Record<string, any>) {
  const cols = Object.keys(sample || {});
  const lower = (s: string) => s.toLowerCase();

  const isIdish = (c: string) =>
    /(^|_)id$/.test(lower(c)) ||
    ["id", "org_id", "organization_id", "test_id"].includes(lower(c));

  // Prefer explicit semantic columns first
  const keyHints = [
    "frequency_code",
    "profile_code",
    "frequency",
    "profile",
    "name",
    "label",
    "code",
    "title",
    "key",
  ];
  const valHints = ["avg", "average", "value", "score", "count", "total", "sum", "mean"];

  const keyCol =
    cols.find((c) => keyHints.some((h) => lower(c).includes(h)) && !isIdish(c)) ||
    cols.find((c) => typeof sample[c] === "string" && !isIdish(c)) ||
    cols.find((c) => !isIdish(c)) ||
    cols[0];

  const valCol =
    cols.find((c) => valHints.some((h) => lower(c).includes(h))) ||
    cols.find((c) => typeof sample[c] === "number") ||
    cols.find((c) => sample[c] != null && !Number.isNaN(Number(sample[c]))) ||
    cols[1] ||
    cols[0];

  return { keyCol, valCol };
}

function toKV(rows: any[] | null | undefined): KV[] {
  if (!rows?.length) return [];
  const sample = rows[0] as Record<string, any>;
  const { keyCol, valCol } = pickCols(sample);
  return rows.map((r) => ({
    key: String(r?.[keyCol] ?? ""),
    value: Number(r?.[valCol] ?? 0),
  }));
}

function onlyOrgRows(orgId: string, rows?: any[] | null) {
  const data = rows ?? [];
  return data.filter(
    (r) => r?.org_id === orgId || r?.organization_id === orgId || r?.orgid === orgId
  );
}

function detectOverall(rows?: any[] | null) {
  const first = (rows ?? [])[0] ?? {};
  const keys = Object.keys(first || {});
  const avgKey = keys.find((k) => ["avg", "average", "mean"].some((w) => k.toLowerCase().includes(w)));
  const countKey = keys.find((k) =>
    ["count", "total", "responses", "n"].some((w) => k.toLowerCase().includes(w))
  );
  return {
    average: avgKey != null ? Number(first[avgKey]) : undefined,
    count: countKey != null ? Number(first[countKey]) : undefined,
  };
}

const PROFILE_ORDER = [
  "PROFILE_1",
  "PROFILE_2",
  "PROFILE_3",
  "PROFILE_4",
  "PROFILE_5",
  "PROFILE_6",
  "PROFILE_7",
  "PROFILE_8",
];

const FREQ_ORDER = ["A", "B", "C", "D"]; // matches your “four frequencies” order

function allSameKey(rows: KV[]) {
  if (!rows.length) return false;
  return rows.every((r) => r.key === rows[0].key);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const testIdParam = (url.searchParams.get("testId") || "").trim() || null;

    if (!orgSlug) return badRequest("Missing ?org=slug");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return serverError("Server misconfigured: missing Supabase env vars.");
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const s = sb.schema("portal");

    // 1) Resolve org by slug
    const orgQ = await s.from("v_organizations").select("id, slug, name").eq("slug", orgSlug).limit(1);
    if (orgQ.error) return serverError(`Org lookup failed: ${orgQ.error.message}`);
    const org = orgQ.data?.[0];
    if (!org) return NextResponse.json({ ok: false, error: "Org not found" }, { status: 404 });

    // 2) Pick a test_id (explicit ?testId wins; else latest test for this org)
    let testId: string | null = testIdParam;
    if (!testId) {
      const testsQ = await s
        .from("v_org_tests")
        .select("id, created_at")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (testsQ.error) {
        // Not fatal; dashboards may be across tests anyway
        testId = null;
      } else {
        testId = testsQ.data?.[0]?.id ?? null;
      }
    }

    // 3) Pull label maps (if we have a test_id)
    type ProfLabel = { profile_code: string; profile_name: string };
    type FreqLabel = { frequency_code: string; frequency_name: string };

    let profileLabels: Record<string, string> = {};
    let frequencyLabels: Record<string, string> = {};

    if (testId) {
      const [plQ, flQ] = await Promise.all([
        s
          .from("test_profile_labels")
          .select("profile_code, profile_name")
          .eq("test_id", testId)
          .in("profile_code", PROFILE_ORDER),
        s
          .from("test_frequency_labels")
          .select("frequency_code, frequency_name")
          .eq("test_id", testId)
          .in("frequency_code", FREQ_ORDER),
      ]);

      if (!plQ.error && plQ.data) {
        profileLabels = Object.fromEntries(
          (plQ.data as ProfLabel[]).map((r) => [r.profile_code, r.profile_name])
        );
      }
      if (!flQ.error && flQ.data) {
        frequencyLabels = Object.fromEntries(
          (flQ.data as FreqLabel[]).map((r) => [r.frequency_code, r.frequency_name])
        );
      }
    }

    // 4) Pull dashboard datasets (scoped by org in-memory)
    const [freqQ, profQ, top3Q, bottom3Q, overallQ] = await Promise.all([
      s.from("v_dashboard_avg_frequency").select("*"),
      s.from("v_dashboard_avg_profile").select("*"),
      s.from("v_dashboard_top3_profiles").select("*"),
      s.from("v_dashboard_bottom3_profiles").select("*"),
      s.from("v_dashboard_overall_avg").select("*").limit(1),
    ]);

    const freqRows = freqQ.error ? [] : onlyOrgRows(org.id, freqQ.data);
    const profRows = profQ.error ? [] : onlyOrgRows(org.id, profQ.data);
    const top3Rows = top3Q.error ? [] : onlyOrgRows(org.id, top3Q.data);
    const bottom3Rows = bottom3Q.error ? [] : onlyOrgRows(org.id, bottom3Q.data);
    const overallRows = overallQ.error ? [] : onlyOrgRows(org.id, overallQ.data);

    // 5) Convert to KV form using heuristics
    let frequencies = toKV(freqRows);
    let profiles = toKV(profRows);
    let top3 = toKV(top3Rows);
    let bottom3 = toKV(bottom3Rows);
    const overall = detectOverall(overallRows);

    // 6) Relabel with real names if keys look useless (all same/UUID-ish) AND we have label maps
    const looksBad = (rows: KV[]) =>
      !rows.length || allSameKey(rows) || /^[0-9a-f-]{30,}$/.test(rows[0]?.key || "");

    if (frequencies.length === 4 && looksBad(frequencies) && Object.keys(frequencyLabels).length) {
      // Map in canonical order A,B,C,D
      frequencies = frequencies.map((r, i) => {
        const code = FREQ_ORDER[i] || `A`;
        const name = frequencyLabels[code] || code;
        return { ...r, key: name };
      });
    }

    if (profiles.length === 8 && looksBad(profiles) && Object.keys(profileLabels).length) {
      // Map in canonical order PROFILE_1..PROFILE_8
      profiles = profiles.map((r, i) => {
        const code = PROFILE_ORDER[i] || `PROFILE_${i + 1}`;
        const name = profileLabels[code] || code;
        return { ...r, key: name };
      });
    }

    // Same treatment for top/bottom if they look bad and we have profile labels
    if (top3.length === 3 && looksBad(top3) && Object.keys(profileLabels).length) {
      // Sort by value desc just in case order matters, then label by position
      top3 = top3
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((r, i) => {
          const code = PROFILE_ORDER[i] || `PROFILE_${i + 1}`;
          const name = profileLabels[code] || `Top ${i + 1}`;
          return { ...r, key: name };
        });
    }
    if (bottom3.length === 3 && looksBad(bottom3) && Object.keys(profileLabels).length) {
      bottom3 = bottom3
        .slice()
        .sort((a, b) => a.value - b.value)
        .map((r, i) => {
          const code = PROFILE_ORDER[i] || `PROFILE_${i + 1}`;
          const name = profileLabels[code] || `Bottom ${i + 1}`;
          return { ...r, key: name };
        });
    }

    const data: DashboardPayload = { frequencies, profiles, top3, bottom3, overall };
    return NextResponse.json({ ok: true, org: orgSlug, testId, data }, { status: 200 });
  } catch (e: any) {
    return serverError(e?.message || "Unknown error");
  }
}
