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

// --- helper to get a default test for an org (if none explicitly chosen) ---
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

    // NOTE: range is currently accepted but not applied to data yet
    const rangeKey = (url.searchParams.get("range") || "all_time").trim();
    const debugMode = url.searchParams.get("debug") === "1";

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    const testId = explicitTestId || (await getTestIdForOrg(portal, orgSlug));

    // ---------- MAIN DASHBOARD QUERIES (all-time) ----------
    let vfQuery = portal
      .from("v_dashboard_avg_frequency")
      .select("org_slug,test_id,frequency_code,frequency_name,avg_points")
      .eq("org_slug", orgSlug);

    let vpQuery = portal
      .from("v_dashboard_avg_profile")
      .select("org_slug,test_id,profile_code,profile_name,avg_points")
      .eq("org_slug", orgSlug);

    let vtQuery = portal
      .from("v_dashboard_top3_profiles")
      .select("org_slug,test_id,profile_code,profile_name,avg_points,rnk")
      .eq("org_slug", orgSlug);

    let vbQuery = portal
      .from("v_dashboard_bottom3_profiles")
      .select("org_slug,test_id,profile_code,profile_name,avg_points,rnk")
      .eq("org_slug", orgSlug);

    let voQuery = portal
      .from("v_dashboard_overall_avg")
      .select("org_slug,test_id,overall_avg")
      .eq("org_slug", orgSlug)
      .limit(1);

    if (testId) {
      vfQuery = vfQuery.eq("test_id", testId);
      vpQuery = vpQuery.eq("test_id", testId);
      vtQuery = vtQuery.eq("test_id", testId);
      vbQuery = vbQuery.eq("test_id", testId);
      voQuery = voQuery.eq("test_id", testId);
    }

    const [vf, vp, vt, vb, vo] = await Promise.all([
      vfQuery,
      vpQuery,
      vtQuery,
      vbQuery,
      voQuery,
    ]);

    if (vf.error) throw vf.error;
    if (vp.error) throw vp.error;
    if (vt.error) throw vt.error;
    if (vb.error) throw vb.error;
    if (vo.error) throw vo.error;

    const frequencies: KV[] = (vf.data || []).map((r: any) => ({
      key: r.frequency_name || r.frequency_code || "",
      value: Number(r.avg_points) || 0,
    }));

    const profiles: KV[] = (vp.data || []).map((r: any) => ({
      key: r.profile_name || r.profile_code || "",
      value: Number(r.avg_points) || 0,
    }));

    const top3: KV[] = (vt.data || [])
      .slice()
      .sort((a: any, b: any) => (a.rnk ?? 999) - (b.rnk ?? 999))
      .map((r: any) => ({
        key: r.profile_name || r.profile_code || "",
        value: Number(r.avg_points) || 0,
      }));

    const bottom3: KV[] = (vb.data || [])
      .slice()
      .sort((a: any, b: any) => (a.rnk ?? 999) - (b.rnk ?? 999))
      .map((r: any) => ({
        key: r.profile_name || r.profile_code || "",
        value: Number(r.avg_points) || 0,
      }));

    let overall: Payload["overall"] = undefined;
    if (vo.data && vo.data[0]) {
      const o = vo.data[0] as any;
      overall = {
        average: Number(o.overall_avg) || undefined,
        count: undefined, // we don't track count in this view yet
      };
    }

    // ---------- LABEL MAPS (for nicer keys) ----------
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
          if (r.frequency_code && r.frequency_name) {
            freqMap[r.frequency_code] = r.frequency_name;
          }
        }
      }

      if (!profileLabels.error && Array.isArray(profileLabels.data)) {
        for (const r of profileLabels.data as any[]) {
          if (r.profile_code && r.profile_name) {
            profileMap[r.profile_code] = r.profile_name;
          }
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
      frequencies: mapWith(frequencies, freqMap),
      profiles: mapWith(profiles, profileMap),
      top3: mapWith(top3, profileMap),
      bottom3: mapWith(bottom3, profileMap),
      overall,
    };

    if (debugMode) {
      return NextResponse.json(
        {
          ok: true,
          org: orgSlug,
          testId,
          range: rangeKey,
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

