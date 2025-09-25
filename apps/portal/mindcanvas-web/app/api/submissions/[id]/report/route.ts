import { NextResponse } from "next/server";
import { extractIdFromUrl } from "@/lib/routeParams";
// import { supabase } from "@/lib/supabaseServer"; // uncomment when you use it

export async function POST(req: Request) {
  const id = extractIdFromUrl(req.url, "submissions");
  if (!id) {
    return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
  }

  // If this endpoint expects a payload:
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // no body provided is OK; keep body = null
  }
  if (body !== null && typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: real logic (e.g., generate or fetch report for `id`)
  // const { data, error } = await supabase.from("reports").select("*").eq("submission_id", id).single();

  return NextResponse.json({ ok: true, id });
}
