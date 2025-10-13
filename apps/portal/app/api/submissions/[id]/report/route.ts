import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { extractIdFromUrl } from "@/lib/routeParams";

export async function GET(req: Request) {
  const id = extractIdFromUrl(req.url);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseServer();
  const tr = await db.from("test_results").select("*").eq("submission_id", id).limit(1).maybeSingle();
  if (tr.error) return NextResponse.json({ error: tr.error.message }, { status: 500 });
  if (tr.data) return NextResponse.json({ ok: true, result: tr.data });

  const vr = await db.from("v_results_latest").select("*").eq("submission_id", id).limit(1).maybeSingle();
  if (vr.error) return NextResponse.json({ error: vr.error.message }, { status: 500 });
  if (!vr.data) return NextResponse.json({ error: "No result for this submission." }, { status: 404 });

  return NextResponse.json({ ok: true, result: vr.data });
}
