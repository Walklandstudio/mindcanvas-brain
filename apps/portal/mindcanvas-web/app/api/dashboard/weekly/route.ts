import { NextResponse } from "next/server";
// import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  // const supabase = supabaseServer();
  // const { data } = await supabase.rpc("dashboard_weekly");
  return NextResponse.json({ ok: true, weekly: [] });
}
