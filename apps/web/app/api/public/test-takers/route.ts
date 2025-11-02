import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("test_taker_reports_view")
    .select("taker_id, email, full_name, frequency, profile, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []).map(d => ({
    id: d.taker_id,
    email: d.email,
    full_name: d.full_name,
    frequency: d.frequency,
    profile: d.profile,
    created_at: d.created_at,
  }));
  return NextResponse.json({ rows });
}
