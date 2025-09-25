import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractParamFromUrl } from "@/lib/routeParams";

export async function POST(req: Request) {
  const id = extractParamFromUrl(req.url, "submissions");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = supabaseServer();

  // read canonical results
  const { data, error } = await supabase
    .from("test_results")
    .select("*")
    .eq("submission_id", id)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { error: "No result yet for this submission. Ensure scoring step has run." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, result: data });
}

