import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export async function GET() {
  // Example real call (uncomment when RPC exists):
  // const { data, error } = await supabase.rpc("dashboard_distribution");
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, distribution: [] });
}

