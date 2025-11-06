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

/** Pick best label/value columns if the view exposes them. */
function pickCols(sample: Record<string, any>) {
  const cols = Object.keys(sample || {});
  const L = (s: string) => s.toLowerCase();
  const isId = (c: string) =>
    /(^|_)id$/.test(L(c)) ||
    ["id", "org_id", "organization_id", "test_id"].includes(L(c));

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
    cols.find((c) => keyHints.some((h) => L(c).includes(h)) && !isId(c)) ||
    cols.find((c) => typeof sample[c] === "string" && !isId(c)) ||
    cols.find((c) => !isId(c)) ||
    cols[0];

  const valCol =
    cols.find((c) => valHints.some((h) => L(c).includes(h))) ||
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

const FREQ_ORDER = ["A", "B", "C", "D"];

function looksUuidish(s: string) {
  return /^[0-9a-f-]{30,}$/i.test(s || "");
}
function allSameKey(rows: KV[]) {
  if (!rows.length) return false;
  return rows.every((r) => r.key === rows[0].key);
}

/** If rows don't expose codes, map by index using a canonical code order. */
function relabelByIndex(rows: KV[], order: string[], names: Record<string, string>) {
  return rows.map((r, i) => {
    const code = order[i] ?? order[order.length - 1];
    return { ...r, key: names[code] ?? code };
  });
}

/** If rows DO expose codes, convert them to friendly names. */
function relabelByCode(rows: KV[], codeToName: Record<string, string>) {
  return rows.map((r) => ({ ...r, key: codeToName[r.key] ?? r.key }));
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

    // 1) Resolve org
    const orgQ = await s.from("v_organizations").select("id, slug, name").eq("slug", orgSlug).limit(1);
    if (orgQ.error) return serverError(`Org lookup failed: ${orgQ.error.message}`);
    const org = orgQ.data?.[0];
    if (!org) return NextResponse.json({ ok: false, error: "Org not found" }, { status: 404 });

    // 2) Determine test_id (explicit > latest for org)
    let testId: string | null = testIdParam;
    if (!testId) {
      const testsQ = await s
        .from("v_org_tests")
        .select("id, created_at")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false })
        .limit(1);
      testId = testsQ.error ? null : testsQ.data?.[0]?.id ?? null;
    }

    // 3) Build label maps from your tables (if we have a test)
    type ProfLabel = { profile_code: string; profile_name: string };
    type FreqLabel = { frequency_code: string; frequency_name: string };

    let profileNames: Record<string, string> = {};
    let frequencyNames: Record<string, string> = {};

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
        profileNames = Object.fromEntries(
          (plQ.data as ProfLabel[]).map((r) => [r.profile_code, r.profile_name])
        );
      }
      if (!flQ.error && flQ.data) {
        frequencyNames = Object.fromEntries(
          (flQ.data as FreqLabel[]).map((r) => [r.frequency_code, r.frequency_name])
        );
      }
    }

    // 4) Pull dashboard datasets
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

    // 5) Convert to KV
    let frequencies = toKV(freqRows);
    let profiles = toKV(profRows);
    let top3 = toKV(top3Rows);
    let bottom3 = toKV(bottom3Rows);
    const overall = detectOverall(overallRows);

    // 6) Relabel with YOUR names
    // Frequencies: if keys don't look like codes and count==4, map by index A,B,C,D
    const freqKeysLookBad = !frequencies.length || allSameKey(frequencies) || looksUuidish(frequencies[0].key);
    if (frequencies.length === 4 && Object.keys(frequencyNames).length) {
      if (freqKeysLookBad) {
        frequencies = relabelByIndex(frequencies, FREQ_ORDER, frequencyNames);
      } else {
        // if keys *are* codes already, rewrite to names by code
        frequencies = relabelByCode(frequencies, frequencyNames);
      }
    }

    // Profiles: similar logic, 8 items in PROFILE_1..8
    const profKeysLookBad = !profiles.length || allSameKey(profiles) || looksUuidish(profiles[0].key);
    if (profiles.length === 8 && Object.keys(profileNames).length) {
      if (profKeysLookBad) {
        profiles = relabelByIndex(profiles, PROFILE_ORDER, profileNames);
      } else {
        profiles = relabelByCode(profiles, profileNames);
      }
    }

    // Top/Bottom 3: if keys look bad and we have profile names, keep order by value and label generically
    if (top3.length === 3) {
      if (profKeysLookBad && Object.keys(profileNames).length) {
        top3 = top3
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((r, i) => ({ ...r, key: `Top ${i + 1}` }));
      }
    }
    if (bottom3.length === 3) {
      if (profKeysLookBad && Object.keys(profileNames).length) {
        bottom3 = bottom3
          .slice()
          .sort((a, b) => a.value - b.value)
          .map((r, i) => ({ ...r, key: `Bottom ${i + 1}` }));
      }
    }

    const data: DashboardPayload = { frequencies, profiles, top3, bottom3, overall };
    return NextResponse.json({ ok: true, org: orgSlug, testId, data }, { status: 200 });
  } catch (e: any) {
    return serverError(e?.message || "Unknown error");
  }
}
