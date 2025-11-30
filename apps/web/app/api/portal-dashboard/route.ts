// apps/web/app/api/portal-dashboard/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

// Time-range helper
type DateRange = { start: string | null; end: string | null };

function getDateRange(key: string | null): DateRange {
  const now = new Date();
  const k = (key || "all_time").toLowerCase();

  const make = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

  const startOfThisWeek = () => {
    const d = make(now);
    const dow = d.getUTCDay(); // 0 = Sun
    const diff = (dow + 6) % 7; // days since Monday
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  };

  const startOfThisMonth = () =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = () =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const startOfThisYear = () =>
    new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const startOfNextYear = () =>
    new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

  let start: Date | null = null;
  let end: Date | null = null;

  switch (k) {
    case "this_week": {
      start = startOfThisWeek();
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
      break;
    }
    case "last_week": {
      const thisWeek = startOfThisWeek();
      end = thisWeek;
      start = new Date(thisWeek);
      start.setUTCDate(thisWeek.getUTCDate() - 7);
      break;
    }
    case "this_month": {
      start = startOfThisMonth();
      end = startOfNextMonth();
      break;
    }
    case "last_month": {
      const thisMonth = startOfThisMonth();
      end = thisMonth;
      start = new Date(thisMonth);
      start.setUTCMonth(thisMonth.getUTCMonth() - 1);
      break;
    }
    case "this_year": {
      start = startOfThisYear();
      end = startOfNextYear();
      break;
    }
    case "last_year": {
      const thisYear = startOfThisYear();
      end = thisYear;
      start = new Date(thisYear);
      start.setUTCFullYear(thisYear.getUTCFullYear() - 1);
      break;
    }
    case "all_time":
    default:
      return { start: null, end: null };
  }

  return { start: start!.toISOString(), end: end!.toISOString() };
}

// Get default test for org if none explicitly set
async function getTestIdForOrg(portal: any, orgSlug: string) {
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
    const rangeKey = (url.searchParams.get("range") || "all_time").trim();
    const debugMode = url.searchParams.get("debug") === "1";

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    const { start, end } = getDateRange(rangeKey);
    let testId = explicitTestId || (await getTestIdForOrg(portal, orgSlug));

    let payload: Payload = {
      frequencies: [],
      profiles: [],
      top3: [],
      bottom3: [],
      overall: undefined,
    };

    // ---------- Branch A: ALL-TIME (no date filter) ----------
    if (!start && !end) {
      const [vf, vp, vt, vb, vo] = await Promise.all([
        portal
          .from("v_dashboard_avg_frequency")
          .select(
            "org_slug,test_id,frequency_code,frequency_name,avg_points"
          )
          .eq("org_slug", orgSlug)
          .maybe(
            testId ? (q: any) => q.eq("test_id", testId) : (q: any) => q
          ),
        portal
          .from("v_dashboard_avg_profile")
          .select("org_slug,test_id,profile_code,profile_name,avg_points")
          .eq("org_slug", orgSlug)
          .maybe(
            testId ? (q: any) => q.eq("test_id", testId) : (q: any) => q
          ),
        portal
          .from("v_dashboard_top3_profiles")
          .select("org_slug,test_id,profile_code,profile_name,avg_points,rnk")
          .eq("org_slug", orgSlug)
          .maybe(
            testId ? (q: any) => q.eq("test_id", testId) : (q: any) => q
          ),
        portal
          .from("v_dashboard_bottom3_profiles")
          .select("org_slug,test_id,profile_code,profile_name,avg_points,rnk")
          .eq("org_slug", orgSlug)
          .maybe(
            testId ? (q: any) => q.eq("test_id", testId) : (q: any) => q
          ),
        portal
          .from("v_dashboard_overall_avg")
          .select("org_slug,test_id,overall_avg")
          .eq("org_slug", orgSlug)
          .maybe(
            testId ? (q: any) => q.eq("test_id", testId) : (q: any) => q
          )
          .limit(1),
      ]);

      const frequencies: KV[] =
        !vf.error && Array.isArray(vf.data)
          ? (vf.data as any[]).map((r) => ({
              key: r.frequency_name || r.frequency_code || "",
              value: Number(r.avg_points) || 0,
            }))
          : [];

      const profiles: KV[] =
        !vp.error && Array.isArray(vp.data)
          ? (vp.data as any[]).map((r) => ({
              key: r.profile_name || r.profile_code || "",
              value: Number(r.avg_points) || 0,
            }))
          : [];

      const top3: KV[] =
        !vt.error && Array.isArray(vt.data)
          ? (vt.data as any[])
              .sort((a, b) => (a.rnk ?? 999) - (b.rnk ?? 999))
              .map((r) => ({
                key: r.profile_name || r.profile_code || "",
                value: Number(r.avg_points) || 0,
              }))
          : [];

      const bottom3: KV[] =
        !vb.error && Array.isArray(vb.data)
          ? (vb.data as any[])
              .sort((a, b) => (a.rnk ?? 999) - (b.rnk ?? 999))
              .map((r) => ({
                key: r.profile_name || r.profile_code || "",
                value: Number(r.avg_points) || 0,
              }))
          : [];

      let overall: Payload["overall"] = undefined;
      if (!vo.error && Array.isArray(vo.data) && vo.data[0]) {
        const o = vo.data[0] as any;
        overall = {
          average: Number(o.overall_avg) || undefined,
          count: undefined, // not tracked in this view
        };
      }

      payload = { frequencies, profiles, top3, bottom3, overall };
    }

    // ---------- Branch B: TIME-FILTERED ----------
    if (start || end) {
      const freqQuery = portal
        .from("v_taker_frequency_scores")
        .select("org_slug,test_id,frequency_code,frequency_name,total_points,created_at")
        .eq("org_slug", orgSlug);

      const profQuery = portal
        .from("v_taker_profile_scores")
        .select(
          "org_slug,test_id,profile_code,profile_name,total_points,created_at,taker_id"
        )
        .eq("org_slug", orgSlug);

      let fq: any = freqQuery;
      let pq: any = profQuery;

      if (testId) {
        fq = fq.eq("test_id", testId);
        pq = pq.eq("test_id", testId);
      }
      if (start) {
        fq = fq.gte("created_at", start);
        pq = pq.gte("created_at", start);
      }
      if (end) {
        fq = fq.lt("created_at", end);
        pq = pq.lt("created_at", end);
      }

      const [freqRes, profRes] = await Promise.all([fq, pq]);

      if (freqRes.error) throw freqRes.error;
      if (profRes.error) throw profRes.error;

      const freqAgg = new Map<string, { label: string; sum: number }>();
      for (const r of (freqRes.data || []) as any[]) {
        const label = r.frequency_name || r.frequency_code || "";
        const cur = freqAgg.get(label) || { label, sum: 0 };
        cur.sum += Number(r.total_points) || 0;
        freqAgg.set(label, cur);
      }

      const profAgg = new Map<string, { label: string; sum: number }>();
      const takerAgg = new Map<string, number>();

      for (const r of (profRes.data || []) as any[]) {
        const label = r.profile_name || r.profile_code || "";
        const cur = profAgg.get(label) || { label, sum: 0 };
        cur.sum += Number(r.total_points) || 0;
        profAgg.set(label, cur);

        if (r.taker_id) {
          const prev = takerAgg.get(r.taker_id) || 0;
          takerAgg.set(
            r.taker_id,
            prev + (Number(r.total_points) || 0)
          );
        }
      }

      const frequencies: KV[] = Array.from(freqAgg.values()).map((v) => ({
        key: v.label,
        value: v.sum,
      }));

      const profiles: KV[] = Array.from(profAgg.values()).map((v) => ({
        key: v.label,
        value: v.sum,
      }));

      const sortedProfiles = [...profiles].sort(
        (a, b) => b.value - a.value
      );
      const top3 = sortedProfiles.slice(0, 3);
      const bottom3 = sortedProfiles.slice(-3).reverse();

      let overall: Payload["overall"] = undefined;
      if (takerAgg.size) {
        const totals = Array.from(takerAgg.values());
        const totalSum = totals.reduce((a, v) => a + v, 0);
        const avg = totalSum / takerAgg.size;
        overall = {
          average: Number(avg.toFixed(1)),
          count: takerAgg.size,
        };
      }

      payload = { frequencies, profiles, top3, bottom3, overall };
    }

    // ---------- Label maps + percent calculation (both branches) ----------
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
      frequencies: mapWith(payload.frequencies, freqMap),
      profiles: mapWith(payload.profiles, profileMap),
      top3: mapWith(payload.top3, profileMap),
      bottom3: mapWith(payload.bottom3, profileMap),
      overall: payload.overall,
    };

    if (debugMode) {
      return NextResponse.json(
        {
          ok: true,
          org: orgSlug,
          testId,
          range: rangeKey,
          debug: { start, end },
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
      { ok: true, org: orgSlug, testId, range: rangeKey, data: out },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

