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

function pct(n: number, total: number) {
  if (!total || !Number.isFinite(n)) return "0%";
  return `${((n * 100) / total).toFixed(1)}%`;
}
function sum(arr: { value: number }[]) {
  return (arr || []).reduce((a, r) => a + (Number(r.value) || 0), 0);
}

// Flexible pickers so we can consume different view shapes safely
function pickKey(row: any): string {
  const c = ["label","name","key","frequency_name","profile_name","frequency_code","profile_code","frequency","profile","code","id"];
  for (const k of c) if (row && row[k] != null) return String(row[k]);
  for (const [k,v] of Object.entries(row || {})) if (typeof v === "string") return v as string;
  return "";
}
function pickValue(row: any): number {
  const c = ["value","avg","average","score","count","total"];
  for (const k of c) if (row && row[k] != null) return Number(row[k]);
  for (const [,v] of Object.entries(row || {})) if (typeof v === "number") return v as number;
  return 0;
}
const toKV = (rows: any): KV[] =>
  Array.isArray(rows) ? rows.map(r => ({ key: pickKey(r), value: pickValue(r) })) : [];

async function getTestIdForOrg(portal: any, orgSlug: string) {
  const v = await portal
    .from("v_org_tests")
    .select("org_slug,test_id,is_active,created_at")
    .eq("org_slug", orgSlug)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);
  const vRow = !v.error && Array.isArray(v.data) && v.data[0];
  if (vRow?.test_id) return String(vRow.test_id);

  const t = await portal
    .from("tests")
    .select("id,org_slug,created_at")
    .eq("org_slug", orgSlug)
    .order("created_at", { ascending: false })
    .limit(1);
  const tRow = !t.error && Array.isArray(t.data) && t.data[0];
  if (tRow?.id) return String(tRow.id);

  return null;
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: "Supabase env not configured" }, { status: 500 });
    }
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const portal = sb.schema("portal");

    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const explicitTestId = (url.searchParams.get("testId") || "").trim() || null;
    if (!orgSlug) return NextResponse.json({ ok: false, error: "Missing ?org=slug" }, { status: 400 });

    // 1) Try consolidated (normalize inner arrays!)
    let payload: Payload | null = null;
    const consolidated = await portal
      .from("v_dashboard_consolidated")
      .select("*")
      .eq("org_slug", orgSlug)
      .limit(1);

    if (!consolidated.error && Array.isArray(consolidated.data) && consolidated.data.length) {
      const row: any = consolidated.data[0];
      payload = {
        frequencies: toKV(row.frequencies),
        profiles: toKV(row.profiles),
        top3: toKV(row.top3),
        bottom3: toKV(row.bottom3),
        overall: row.overall ?? undefined,
      };
    }

    // 2) Fallback to per-view (already normalized)
    if (!payload) {
      const [vf, vp, vt, vb, vo] = await Promise.all([
        portal.from("v_dashboard_avg_frequency").select("*").eq("org_slug", orgSlug),
        portal.from("v_dashboard_avg_profile").select("*").eq("org_slug", orgSlug),
        portal.from("v_dashboard_top3_profiles").select("*").eq("org_slug", orgSlug),
        portal.from("v_dashboard_bottom3_profiles").select("*").eq("org_slug", orgSlug),
        portal.from("v_dashboard_overall_avg").select("*").eq("org_slug", orgSlug).limit(1),
      ]);

      const frequencies = !vf.error ? toKV(vf.data) : [];
      const profiles   = !vp.error ? toKV(vp.data) : [];
      const top3       = !vt.error ? toKV(vt.data) : [];
      const bottom3    = !vb.error ? toKV(vb.data) : [];

      let overall: Payload["overall"] = undefined;
      if (!vo.error && Array.isArray(vo.data) && vo.data[0]) {
        const o = vo.data[0] as any;
        const average = (o.average ?? o.avg ?? o.value) as number | undefined;
        const count = (o.count ?? o.total) as number | undefined;
        overall = { average, count };
      }

      payload = { frequencies, profiles, top3, bottom3, overall };
    }

    // 3) Label maps (if we can resolve a test id)
    const testId = explicitTestId || (await getTestIdForOrg(portal, orgSlug));
    let freqMap: Record<string, string> = {};
    let profileMap: Record<string, string> = {};

    if (testId) {
      const [freqLabels, profileLabels] = await Promise.all([
        portal.from("test_frequency_labels").select("frequency_code,frequency_name").eq("test_id", testId),
        portal.from("test_profile_labels").select("profile_code,profile_name").eq("test_id", testId),
      ]);
      if (!freqLabels.error && Array.isArray(freqLabels.data)) {
        for (const r of freqLabels.data as any[]) {
          if (r.frequency_code && r.frequency_name) freqMap[r.frequency_code] = r.frequency_name;
        }
      }
      if (!profileLabels.error && Array.isArray(profileLabels.data)) {
        for (const r of profileLabels.data as any[]) {
          if (r.profile_code && r.profile_name) profileMap[r.profile_code] = r.profile_name;
        }
      }
    }

    const mapWithPercent = (rows: KV[], map: Record<string, string>) => {
      const total = sum(rows);
      return (rows || []).map((r) => ({
        ...r,
        key: map[r.key] || r.key,
        percent: pct(Number(r.value) || 0, total),
      }));
    };

    const out: Payload = {
      frequencies: mapWithPercent(payload.frequencies || [], freqMap),
      profiles: mapWithPercent(payload.profiles || [], profileMap),
      top3: mapWithPercent(payload.top3 || [], profileMap),
      bottom3: mapWithPercent(payload.bottom3 || [], profileMap),
      overall: payload.overall,
    };

    return NextResponse.json({ ok: true, org: orgSlug, testId, data: out }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
