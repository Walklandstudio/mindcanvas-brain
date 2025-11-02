import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
  const { data, error } = await s
    .from("test_links")
    .select("id, token, status, use_count, max_uses, test_id, org_id")
    .eq("token", params.token)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  return NextResponse.json({ link: data });
}
