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
  return `${(n * 100 / total).toFixed(1)}%`;
}

// Pick an org's "current" test id
async function getTestIdForOrg(sb: ReturnType<typeof createClient>, orgSlug: string) {
  // Try view first
  const v = await sb.from("v_org_tests").select("org_slug,test_id,is_active,created_at").eq("org_slug", orgSlug).order("is_active", { ascending: false }).order("created_at", { ascending: false }).limit(1);
  if (!v.error && v.data && v.data.length) return v.data[0].test_id as string;

  // Fallback: any test linked to org via portal.tests (if present)
  const t = await sb.from("tests").select("id,org_slug,created_at").eq("org_slug", orgSlug).order("created_at", { ascending: false }).limit(1);
  if (!t.error && t.data && t.data.length) return t.data[0].id as string;

  return null;
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: "Supabase env not configured" }, { status: 500 });
    }
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "portal" } });

    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    const explicitTestId = (url.searchParams.get("testId") || "").trim() || null;

    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: "Missing ?org=slug" }, { status: 400 });
    }

    // 1) Load consolidated dashboard payload (whatever you already have wired)
    // Try RPC first
    let payload: Payload | null = null;
    const rpc = await sb.rpc("fn_get_dashboard_data", { p_org_slug: orgSlug, p_test_id: explicitTestId });
    if (!rpc.error && rpc.data) {
      payload = rpc.data as Payload;
    } else {
      // Fallback: read from views
      const consolidated = await sb.from("v_dashboard_consolidated").select("*").eq("org_slug", orgSlug);
      if (!consolidated.error && consolidated.data && consolidated.data.length) {
        // Expect columns frequencies, profiles, top3, bottom3, overall (json)
        const row = consolidated.data[0] as any;
        payload = {
          frequencies: row.frequencies ?? [],
          profiles: row.profiles ?? [],
          top3: row.top3 ?? [],
          bottom3: row.bottom3 ?? [],
          overall: row.overall ?? undefined,
        };
      }
    }

    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Dashboard data source not found. Ensure RPC portal.fn_get_dashboard_data or view portal.v_dashboard_consolidated is present.",
        },
        { status: 404 }
      );
    }

    // 2) Decide test_id for label lookup
    const testId = explicitTestId || (await getTestIdForOrg(sb, orgSlug));

    // 3) Build label maps (safe if no testId)
    let freqMap: Record<string, string> = {};
    let profileMap: Record<string, string> = {};

    if (testId) {
      const [freqLabels, profileLabels] = await Promise.all([
        sb.from("test_frequency_labels").select("frequency_code,frequency_name").eq("test_id", testId),
        sb.from("test_profile_labels").select("profile_code,profile_name").eq("test_id", testId),
      ]);

      if (!freqLabels.error && freqLabels.data) {
        for (const r of freqLabels.data as any[]) {
          if (r.frequency_code && r.frequency_name) freqMap[r.frequency_code] = r.frequency_name;
        }
      }
      if (!profileLabels.error && profileLabels.data) {
        for (const r of profileLabels.data as any[]) {
          if (r.profile_code && r.profile_name) profileMap[r.profile_code] = r.profile_name;
        }
      }
    }

    // 4) Normalize + compute percent shares (server-trusted)
    const sum = (arr: KV[]) => arr.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
    const freqTotal = sum(payload.frequencies || []);
    const profTotal = sum(payload.profiles || []);

    const mapRows = (rows: KV[], map: Record<string, string>) =>
      (rows || []).map((r) => {
        const key = map[r.key] || r.key; // map code→name if available
        return { ...r, key, percent: pct(Number(r.value) || 0, sum(rows)) };
      });

    const frequencies = mapRows(payload.frequencies || [], freqMap);
    const profiles = mapRows(payload.profiles || [], profileMap);
    const top3 = mapRows(payload.top3 || [], profileMap);
    const bottom3 = mapRows(payload.bottom3 || [], profileMap);

    // Count: prefer profiles total, else frequencies; else null
    const overallCount =
      payload.overall?.count ??
      (Number.isFinite(profTotal) && profTotal > 0 ? profTotal : Number.isFinite(freqTotal) && freqTotal > 0 ? freqTotal : undefined);

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
