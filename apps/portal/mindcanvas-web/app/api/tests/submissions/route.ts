// app/api/tests/submissions/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Body = {
  test_slug: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  org_id?: string;
  client_id?: string;
  phone?: string;
};

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: Request) {
  let b: Body;
  try {
    const raw: unknown = await req.json();
    if (!isObj(raw) || typeof raw["test_slug"] !== "string") {
      return NextResponse.json({ error: "Missing test_slug" }, { status: 400 });
    }
    b = {
      test_slug: raw["test_slug"],
      first_name: typeof raw["first_name"] === "string" ? raw["first_name"] : undefined,
      last_name: typeof raw["last_name"] === "string" ? raw["last_name"] : undefined,
      email: typeof raw["email"] === "string" ? raw["email"] : undefined,
      org_id: typeof raw["org_id"] === "string" ? raw["org_id"] : undefined,
      client_id: typeof raw["client_id"] === "string" ? raw["client_id"] : undefined,
      phone: typeof raw["phone"] === "string" ? raw["phone"] : undefined,
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = supabaseServer();

  // Resolve a UUID test_id if possible
  let testId: string | null = null;
  if (isUUID(b.test_slug)) {
    testId = b.test_slug;
  } else {
    // Try to find a test by slug/code/name
    const r = await db
      .from("tests")
      .select("id")
      .or(`slug.eq.${b.test_slug},code.eq.${b.test_slug},name.eq.${b.test_slug}`)
      .limit(1)
      .maybeSingle();
    if (!r.error && r.data && typeof r.data.id === "string") {
      testId = r.data.id;
    }
  }

  const ins = await db
    .from("mc_submissions")
    .insert({
      test_id: testId, // null if we couldn't resolve a UUID — avoids the uuid syntax error
      first_name: b.first_name ?? null,
      last_name: b.last_name ?? null,
      email: b.email ?? null,
      org_id: b.org_id ?? null,
      client_id: b.client_id ?? null,
      phone: b.phone ?? null,
      // if you later add a text column "test_slug", you can store b.test_slug there too
    })
    .select("id")
    .maybeSingle();

  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  if (!ins.data) return NextResponse.json({ error: "Insert returned no id" }, { status: 500 });

  return NextResponse.json({ ok: true, id: (ins.data as { id: string }).id });
}
