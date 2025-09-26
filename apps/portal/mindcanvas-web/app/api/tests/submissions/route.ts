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

export async function POST(req: Request) {
  let b: Body | null = null;
  try {
    const raw: unknown = await req.json();
    if (!isObj(raw)) throw new Error("bad body");
    if (typeof raw["test_slug"] !== "string") throw new Error("Missing test_slug");
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const db = supabaseServer();
  const { data, error } = await db
    .from("mc_submissions")
    .insert({
      test_id: b.test_slug,        // if you use a UUID test_id, swap to that column/value
      first_name: b.first_name ?? null,
      last_name: b.last_name ?? null,
      email: b.email ?? null,
      org_id: b.org_id ?? null,
      client_id: b.client_id ?? null,
      phone: b.phone ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "No id returned" }, { status: 500 });

  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
