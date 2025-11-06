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

// TS-loose helper: pick an org's current test id from portal schema
async function getTestIdForOrg(sb: any, orgSlug: string) {
  const portal = sb.schema("portal");

  const v = await portal
    .from("v_org_tests")
    .select<any>("org_slug,test_id,is_active,created_at")
    .eq("org_slug", orgSlug)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  const vRow = !v.error && Array.isArray(v.data) && (v.data as any[])[0];
  if (vRow?.test_id) return String(vRow.test_id);

  const t = await portal
    .from("tests")
    .select<any>("id,org_slug,created_at")
    .eq("org_slug", orgSlug)
    .order("created_at", { ascending: false })
    .limit(1);

  const tRow = !t.error && Array.isArray(t.data) && (t.data as any[])[0];
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

    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: "Missing ?org=slug" }, { status: 400 });
    }

    // Read consolidated dashboard row from portal schema
    let payload: Payload | null = null;
    const consolidated = await portal
      .from("v_dashboard_consolidated")
      .select<any>("*")
      .eq("org_slug", orgSlug)
      .limit(1);

    if (!consolidated.error && Array.isArray(consolidated.data) && consolidated.data.length) {
      const row: any = consolidated.data[0];
      payload = {
        frequencies: row.frequencies ?? [],
        profiles: row.profiles ?? [],
        top3: row.top3 ?? [],
        bottom3: row.bottom3 ?? [],
        overall: row.overall ?? undefined,
      };
    }

    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "portal.v_dashboard_consolidated not found or empty for this org." },
        { status: 404 }
      );
    }

    // Decide test_id for label lookup
    const testId = explicitTestId || (await getTestIdForOrg(sb, orgSlug));

    // Build label maps from portal tables (if testId is known)
    let freqMap: Record<string, string> = {};
    let profileMap: Record<string, string> = {};

    if (testId) {
      const [freqLabels, profileLabels] = await Promise.all([
        portal.from("test_frequency_labels").select<any>("frequency_code,frequency_name").eq("test_id", testId),
        portal.from("test_profile_labels").select<any>("profile_code,profile_name").eq("test_id", testId),
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

    // Normalize + compute percent server-side
    const sum = (arr: KV[]) => arr.reduce((acc, r) => acc + (Number(r.value) || 0), 0);

    const mapWithPercent = (rows: KV[], map: Record<string, string>) => {
      const total = sum(rows);
      return (rows || []).map((r) => ({
        ...r,
        key: map[r.key] || r.key,
        percent: pct(Number(r.value) || 0, total),
      }));
    };

    const frequencies = mapWithPercent(payload.frequencies || [], freqMap);
    const profiles = mapWithPercent(payload.profiles || [], profileMap);
    const top3 = mapWithPercent(payload.top3 || [], profileMap);
    const bottom3 = mapWithPercent(payload.bottom3 || [], profileMap);

    const freqTotal = sum(payload.frequencies || []);
    const profTotal = sum(payload.profiles || []);
    const overallCount =
      payload.overall?.count ??
      (profTotal > 0 ? profTotal : freqTotal > 0 ? freqTotal : undefined);

    const out: Payload = {
      frequencies,
      profiles,
      top3,
      bottom3,
      overall: {
        average: payload.overall?.average,
        count: overallCount,
      },
    };

    return NextResponse.json({ ok: true, org: orgSlug, testId, data: out }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
