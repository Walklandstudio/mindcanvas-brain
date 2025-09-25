// app/api/tests/[slug]/route.ts
import { NextResponse } from "next/server";
// If/when you need DB access, uncomment this:
// import { supabase } from "@/lib/supabaseServer";

function getSlugFromUrl(u: string): string {
  try {
    const parts = new URL(u).pathname.split("/"); // ["", "api", "tests", "{slug}"]
    const i = parts.indexOf("tests");
    return i >= 0 ? parts[i + 1] ?? "" : "";
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  const slug = getSlugFromUrl(req.url);
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  // Example (uncomment and adjust when ready):
  // const { data, error } = await supabase.from("tests").select("*").eq("slug", slug).single();
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // return NextResponse.json(data);

  return NextResponse.json({ ok: true, slug });
}

