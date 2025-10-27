import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
  const { data, error } = await s
    .from("tests")
    .select("id, name, slug, org_id, is_active")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  return NextResponse.json({ test: data });
}
