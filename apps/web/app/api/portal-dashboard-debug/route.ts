import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const s = sb.schema("portal");

  const t1 = await s.from("orgs").select("id, slug, name").order("slug", { ascending: true });
  if (t1.error && t1.error.message.includes("schema cache")) {
    const t2 = await s.from("v_organizations").select("id, slug, name").order("slug", { ascending: true });
    if (t2.error) return NextResponse.json({ ok: false, error: t2.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, orgs: t2.data, via: "v_organizations" }, { status: 200 });
  }
  if (t1.error) return NextResponse.json({ ok: false, error: t1.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, orgs: t1.data, via: "orgs" }, { status: 200 });
}
