// app/api/dashboard/latest/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const org = new URL(req.url).searchParams.get("org") ?? "competency-coach";

  const { data, error } = await supabase
    .from("v_results_latest")
    .select("*")
    .eq("org_slug", org)
    .order("taken_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
