import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ----- helpers -----
type KV = { key: string; value: number; percent?: string };
type Payload = {
  frequencies: KV[];
  profiles: KV[];
  top3: KV[];
  bottom3: KV[];
  overall?: { average?: number; count?: number };
};

const sum = (rows: { value: number }[]) =>
  (rows || []).reduce((a, r) => a + (Number(r.value) || 0), 0);

const pct = (n: number, total: number) =>
  !total ? "0%" : `${((n * 100) / total).toFixed(1)}%`;

// pick a label-ish field
const pickKey = (row: any): string => {
  const cands = [
    "label",
    "name",
    "key",
    "frequency_name",
    "profile_name",
    "frequency_code",
    "profile_code",
    "frequency",
    "profile",
    "code",
    "id",
    "slug",
  ];
  for (const k of cands) if (row && row[k] != null) return String(row[k]);
  for (const [k, v] of Object.entries(row || {}))
    if (typeof v === "string") return v as string;
  return "";
};
// pick a numeric field
const pickValue = (row: any): number => {
  const cands = ["value", "avg", "average", "score", "count", "total"];
  for (const k of cands) if (row && row[k] != null) return Number(row[k]);
  for (const [, v] of Object.entries(row || {}))
    if (typeof v === "number") return v as number;
  return 0;
};

const toKV = (rows: any): KV[] =>
  Array.isArray(rows)
    ? rows.map((r) => ({ key: pickKey(r), value: pickValue(r) }))
    : [];

const parseMaybeJSON = (x: any) => {
  if (Array.isArray(x)) return x;
  if (typeof x === "string") {
    try {
      const j = JSON.parse(x);
      return Array.isArray(j) ? j : [];
    } catch {}
  }
  return [];
};

const withPercent = (rows: KV[]): KV[] => {
  const total = sum(rows);
  return rows.map((r) => ({ ...r, percent: pct(Number(r.value) || 0, total) }));
};

// ---------- test selection helpers ----------

// legacy fallback (your existing behaviour)
async function getLegacyTestIdForOrg(portal: any, orgSlug: string) {
  // Try view first (active test), then tests table
  const v = await portal
    .from("v_org_tests")
    .select("*")
    .eq("org_slug", orgSlug)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  if (!v.error && v.data?.[0]?.test_id) return String(v.data[0].test_id);

  const t = await portal
    .from("tests")
    .select("id")
    .eq("org_slug", orgSlug)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!t.error && t.data?.[0]?.id) return String(t.data[0].id);

  return null;
}

// new generic: explicit testId > default-dashboard flag > legacy
async function getDashboardTestId(
  portal: any,
  orgSlug: string,
  explicitTestId: string | null
) {
  if (explicitTestId) return explicitTestId;

  // 1) prefer test marked as default dashboard
  const t = await portal
    .from("tests")
    .select("id, is_default_dashboard")
    .eq("org_slug", orgSlug)
    .order("is_default_dashboard", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (!t.error && t.data?.[0]?.id) {
    return String(t.data[0].id);
  }

  // 2) fallback to legacy behaviour (v_org_tests / newest test)
  return await getLegacyTestIdForOrg(portal, orgSlug);
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Supabase env not configured" },
        { status: 500 }
      );
    }
    const sb: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const portal = sb.schema("portal");

    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const explicitTestId =
      (url.searchParams.get("testId") || "").trim() || null;
    const debugMode = url.searchParams.get("debug") === "1";

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    // ---------- choose test for this dashboard ----------
    const testId = await getDashboardTestId(portal, orgSlug, explicitTestId);

    let dbg: any = { steps: [] as any[] };

    // helper for adding common filters
    const withFilters = (q: any) => {
      let query = q.eq("org_slug", orgSlug);
      if (testId) query = query.eq("test_id", testId);
      return query;
    };

    // ---------- 1) consolidated fast-path ----------
    let payload: Payload | null = null;
    const c = await withFilters(
      portal.from("v_dashboard_consolidated").select("*")
    ).limit(1);

    if (!c.error && Array.isArray(c.data) && c.data.length) {
      const row: any = c.data[0] || {};
      const frequencies = toKV(parseMaybeJSON(row.frequencies));
      const profiles = toKV(parseMaybeJSON(row.profiles));
      const top3 = toKV(parseMaybeJSON(row.top3));
      const bottom3 = toKV(parseMaybeJSON(row.bottom3));
      const overall = row.overall ?? undefined;

      payload = { frequencies, profiles, top3, bottom3, overall };
      dbg.steps.push({
        src: "consolidated",
        sizes: {
          frequencies: frequencies.length,
          profiles: profiles.length,
          top3: top3.length,
          bottom3: bottom3.length,
          overall: overall ? 1 : 0,
        },
      });
    }

    // ---------- 2) per-view fallback ----------
    if (
      !payload ||
      (payload.frequencies.length === 0 &&
        payload.profiles.length === 0 &&
        payload.top3.length === 0 &&
        payload.bottom3.length === 0)
    ) {
      const [vf, vp, vt, vb, vo] = await Promise.all([
        withFilters(portal.from("v_dashboard_avg_frequency").select("*")),
        withFilters(portal.from("v_dashboard_avg_profile").select("*")),
        withFilters(portal.from("v_dashboard_top3_profiles").select("*")),
        withFilters(portal.from("v_dashboard_bottom3_profiles").select("*")),
        withFilters(portal.from("v_dashboard_overall_avg").select("*")).limit(
          1
        ),
      ]);

      const frequencies = !vf.error ? toKV(vf.data) : [];
      const profiles = !vp.error ? toKV(vp.data) : [];
      const top3 = !vt.error ? toKV(vt.data) : [];
      const bottom3 = !vb.error ? toKV(vb.data) : [];

      let overall: Payload["overall"] = undefined;
      if (!vo.error && Array.isArray(vo.data) && vo.data[0]) {
        const o = vo.data[0] as any;
        overall = {
          average: Number(o.average ?? o.avg ?? o.value) || undefined,
          count: Number(o.count ?? o.total) || undefined,
        };
      }

      payload = { frequencies, profiles, top3, bottom3, overall };
      dbg.steps.push({
        src: "per_views",
        sizes: {
          frequencies: frequencies.length,
          profiles: profiles.length,
          top3: top3.length,
          bottom3: bottom3.length,
          overall: overall ? 1 : 0,
        },
        samples: {
          avg_frequency: vf.data?.slice?.(0, 2) ?? null,
          avg_profile: vp.data?.slice?.(0, 2) ?? null,
        },
      });
    }

    // ---------- 3) optional label maps ----------
    let freqMap: Record<string, string> = {};
    let profileMap: Record<string, string> = {};

    if (testId) {
      const [freqLabels, profileLabels] = await Promise.all([
        portal
          .from("test_frequency_labels")
          .select("frequency_code,frequency_name")
          .eq("test_id", testId),
        portal
          .from("test_profile_labels")
          .select("profile_code,profile_name")
          .eq("test_id", testId),
      ]);
      if (!freqLabels.error && Array.isArray(freqLabels.data)) {
        for (const r of freqLabels.data as any[]) {
          if (r.frequency_code && r.frequency_name)
            freqMap[r.frequency_code] = r.frequency_name;
        }
      }
      if (!profileLabels.error && Array.isArray(profileLabels.data)) {
        for (const r of profileLabels.data as any[]) {
          if (r.profile_code && r.profile_name)
            profileMap[r.profile_code] = r.profile_name;
        }
      }
      dbg.steps.push({
        src: "labels",
        testId,
        freqLabels: Object.keys(freqMap).length,
        profileLabels: Object.keys(profileMap).length,
      });
    } else {
      dbg.steps.push({ src: "labels", testId: null });
    }

    const mapWith = (rows: KV[], map: Record<string, string>) => {
      const total = sum(rows);
      return rows.map((r) => ({
        ...r,
        key: map[r.key] || r.key,
        percent: pct(Number(r.value) || 0, total),
      }));
    };

    const out: Payload = {
      frequencies: mapWith(payload!.frequencies, freqMap),
      profiles: mapWith(payload!.profiles, profileMap),
      top3: mapWith(payload!.top3, profileMap),
      bottom3: mapWith(payload!.bottom3, profileMap),
      overall: payload!.overall,
    };

    if (debugMode) {
      return NextResponse.json(
        {
          ok: true,
          org: orgSlug,
          testId,
          debug: dbg,
          data_preview: {
            frequencies: out.frequencies.slice(0, 4),
            profiles: out.profiles.slice(0, 4),
            top3: out.top3,
            bottom3: out.bottom3,
            overall: out.overall,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: true, org: orgSlug, testId, data: out },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

