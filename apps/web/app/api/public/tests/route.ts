import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)!,
    { auth: { persistSession: false }, db: { schema: "portal" } }
  );

  // Your schema does not have is_active; list all tests (optionally order by name)
  const { data, error } = await supabase
    .from("tests")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tests: data ?? [] });
}
