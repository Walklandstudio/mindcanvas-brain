import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

function extractIdFromUrl(u: string): string {
  const parts = new URL(u).pathname.split("/");
  const i = parts.indexOf("submissions");
  return i >= 0 ? parts[i + 1] ?? "" : "";
}

export async function POST(req: Request) {
  const id = extractIdFromUrl(req.url);

  // ... your finish logic here, e.g. mark submission finished in Supabase
  // await supabase.from("submissions").update({ status: "finished" }).eq("id", id);

  return NextResponse.json({ ok: true, id });
}

