// app/api/submissions/[id]/answer/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

function extractIdFromUrl(u: string): string {
  const segments = new URL(u).pathname.split("/"); // ["", "api", "submissions", "{id}", "answer"]
  const i = segments.indexOf("submissions");
  return i >= 0 ? segments[i + 1] ?? "" : "";
}

export async function POST(req: Request) {
  const id = extractIdFromUrl(req.url); // <-- no second arg needed

  const bodyUnknown: unknown = await req.json();
  if (typeof bodyUnknown !== "object" || bodyUnknown === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: validate payload shape as needed and persist using `supabase`
  // await supabase.from("submissions").update({ ... }).eq("id", id);

  return NextResponse.json({ ok: true, id });
}

