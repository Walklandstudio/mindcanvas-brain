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

/**
 * Heuristics to pick a human-ish label and numeric value column
 * from arbitrary view shapes. We ignore obvious *_id columns for labels.
 */
function pickCols(sample: Record<string, any>) {
  const cols = Object.keys(sample || {});
  const lower = (s: string) => s.toLowerCase();

  const isIdish = (c: string) =>
    /(^|_)id$/.test(lower(c)) ||
    ["id", "org_id", "organization_id", "test_id", "orgid", "testid"].includes(lower(c));

  const preferKeyHints = ["frequency", "freq", "profile", "name", "label", "code", "title", "key"];
  const preferValHints = ["avg", "average", "value", "score", "count", "total", "sum", "mean"];

  const keyCol =
    cols.find((c) => preferKeyHints.some((h) => lower(c).includes(h)) && !isIdish(c)) ||
    cols.find((c) => typeof sample[c] === "string" && !isIdish(c)) ||
    cols.find((c) => !isIdish(c)) ||
    cols[0];

  const valCol =
    cols.find((c) => preferValHints.some((h) => lower(c).includes(h))) ||
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

/** Fallback: when views don’t expose human labels and all keys are identical */
function allSameKey(rows: KV[]) {
  if (!rows.length) return false;
  return rows.every((r) => r.key === rows[0].key);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const testId = (url.searchParams.get("testId") || "").trim() || null; // reserved for future scoping

    if (!orgSlug) return badRequest("Missing ?org=slug");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return serverError("Server misconfigured: missing Supabase env vars.");
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const s = sb.schema("portal");

    // Resolve org by slug
    const orgQ = await s.from("v_organizations").select("id, slug, name").eq("slug", orgSlug).limit(1);
    if (orgQ.error) return serverError(`Org lookup failed: ${orgQ.error.message}`);
    const org = orgQ.data?.[0];
    if (!org) return NextResponse.json({ ok: false, error: "Org not found" }, { status: 404 });

    // Pull dashboard datasets
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

    let frequencies = toKV(freqRows);
    let profiles = toKV(profRows);
    let top3 = toKV(top3Rows);
    let bottom3 = toKV(bottom3Rows);
    const overall = detectOverall(overallRows);

    // Friendly visual fallbacks if views don’t provide labels (avoid UUIDs)
    if (frequencies.length === 4 && allSameKey(frequencies)) {
      const labels = ["Frequency A", "Frequency B", "Frequency C", "Frequency D"];
      frequencies = frequencies.map((r, i) => ({ ...r, key: labels[i] || `Frequency ${i + 1}` }));
    }
    if (profiles.length === 8 && allSameKey(profiles)) {
      const labels = [
        "Profile 1",
        "Profile 2",
        "Profile 3",
        "Profile 4",
        "Profile 5",
        "Profile 6",
        "Profile 7",
        "Profile 8",
      ];
      profiles = profiles.map((r, i) => ({ ...r, key: labels[i] || `Profile ${i + 1}` }));
    }
    if (top3.length === 3 && allSameKey(top3)) {
      top3 = top3.map((r, i) => ({ ...r, key: `Top ${i + 1}` }));
    }
    if (bottom3.length === 3 && allSameKey(bottom3)) {
      bottom3 = bottom3.map((r, i) => ({ ...r, key: `Bottom ${i + 1}` }));
    }

    const data: DashboardPayload = { frequencies, profiles, top3, bottom3, overall };

    return NextResponse.json({ ok: true, org: orgSlug, data }, { status: 200 });
  } catch (e: any) {
    return serverError(e?.message || "Unknown error");
  }
}
