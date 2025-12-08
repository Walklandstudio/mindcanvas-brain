// apps/web/app/api/admin/orgs/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function GET() {
  const sb = createClient().schema("portal");
  const { data, error } = await sb
    .from("orgs")
    .select("id, slug, name")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const sb = createClient().schema("portal");

  let body: { name?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim();

  if (!name || !slug) {
    return NextResponse.json(
      { ok: false, error: "Both name and slug are required" },
      { status: 400 }
    );
  }

  // TODO: add super-admin auth check here if needed

  const { data: org, error } = await sb
    .from("orgs")
    .insert({ name, slug })
    .select("id, name, slug")
    .single();

  if (error || !org) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Failed to create organisation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, org });
}

