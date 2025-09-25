import { NextResponse } from "next/server";
import { extractParamFromUrl } from "@/lib/routeParams";
// import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const id = extractParamFromUrl(req.url, "submissions");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // const supabase = supabaseServer();
  // const body = (await req.json()) as unknown;

  return NextResponse.json({ ok: true, id });
}

