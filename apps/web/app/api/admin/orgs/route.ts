import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function GET() {
  const sb = createClient().schema("portal");
  const { data, error } = await sb
    .from("orgs")
    .select("id, slug, name")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
