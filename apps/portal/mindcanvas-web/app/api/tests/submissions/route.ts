// app/api/tests/submissions/route.ts
import { NextResponse } from "next/server";
// import { supabase } from "@/lib/supabaseServer"; // uncomment when used

export async function POST(req: Request) {
  // const payload = await req.json().catch(() => null);
  // if (!payload || typeof payload !== "object") {
  //   return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  // }

  // Example (when ready):
  // const { data, error } = await supabase.from("submissions").insert(payload).select().single();
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
