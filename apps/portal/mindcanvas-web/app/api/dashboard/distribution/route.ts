// app/api/dashboard/distribution/route.ts
import { NextResponse } from "next/server";
// import { supabase } from "@/lib/supabaseServer"; // remove or uncomment when used

export async function GET() {
  // const { data, error } = await supabase.rpc("dashboard_distribution");
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, distribution: [] });
}

