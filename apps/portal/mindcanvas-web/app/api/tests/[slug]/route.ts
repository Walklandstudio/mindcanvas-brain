import { NextResponse } from "next/server";
import { extractParamFromUrl } from "@/lib/routeParams";
// import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const slug = extractParamFromUrl(req.url, "tests");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  // const supabase = supabaseServer();
  // const { data, error } = await supabase.from("tests").select("*").eq("slug", slug).single();

  return NextResponse.json({ ok: true, slug });
}
