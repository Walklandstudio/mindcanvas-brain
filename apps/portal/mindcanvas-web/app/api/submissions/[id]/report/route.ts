import { NextResponse } from "next/server";
// import { supabase } from "@/lib/supabaseServer"; // uncomment when you use it

export async function POST() {
  // Example when you start using the body:
  // const payload = await req.json();
  // const { data, error } = await supabase.from("submissions").insert(payload).select().single();
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
