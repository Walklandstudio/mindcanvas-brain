import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toKV(rows: any[]): { key: string; value: number }[] {
  if (!rows?.length) return [];
  const sample = rows[0] as Record<string, any>;
  const cols = Object.keys(sample);
  let keyCol = cols.find((c) => typeof sample[c] === "string") || cols[0];
  let valCol =
    cols.find((c) => typeof sample[c] === "number") ||
    cols.find((c) => sample[c] != null && !isNaN(Number(sample[c]))) ||
    cols[1] ||
    cols[0];

  return rows.map((r) => ({
    key: String(r[keyCol] ?? ""),
    value: Number(r[valCol] ?? 0),
  }));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();
    if (!orgSlug) return NextResponse.json({ ok: false, error: "Missing ?org=slug" }, { status: 400 });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const s = sb.schema("portal");

    // 1. Get the org ID
    const orgQ = await s.from("v_organizations").select("id, slug").eq("slug", orgSlug).limit(1);
    if (orgQ.error) throw new Error("Org lookup failed: " + orgQ.error.message);
    const org = orgQ.data?.[0];
    if (!org) throw new Error("Org not found");

    // 2. Query all dashboard views
    const [freq, prof, top3, bottom3, overall] = await Promise.all([
      s.from("v_dashboard_avg_frequency").select("*").eq("org_id", org.id),
      s.from("v_dashboard_avg_profile").select("*").eq("org_id", org.id),
      s.from("v_dashboard_top3_profiles").select("*").eq("org_id", org.id),
      s.from("v_dashboard_bottom3_profiles").select("*").eq("org_id", org.id),
      s.from("v_dashboard_overall_avg").select("*").eq("org_id", org.id).limit(1),
    ]);

    const frequencies = toKV(freq.data || []);
    const profiles = toKV(prof.data || []);
    const top3Data = toKV(top3.data || []);
    const bottom3Data = toKV(bottom3.data || []);

    const row = overall.data?.[0] || {};
    const avgKey = Object.keys(row).find(k => k.toLowerCase().includes("avg"));
    const cntKey = Object.keys(row).find(k => k.toLowerCase().includes("count"));
    const overallData = {
      average: avgKey ? Number(row[avgKey]) : undefined,
      count: cntKey ? Number(row[cntKey]) : undefined,
    };

    return NextResponse.json({
      ok: true,
      org: orgSlug,
      data: { frequencies, profiles, top3: top3Data, bottom3: bottom3Data, overall: overallData },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
