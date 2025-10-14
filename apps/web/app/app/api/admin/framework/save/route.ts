// apps/web/app/api/admin/framework/save/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const supabase = getServiceClient();
  const body = await req.json();

  if (!body?.type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

  if (body.type === "frequency") {
    const letter = body.letter as "A" | "B" | "C" | "D";
    if (!letter) return NextResponse.json({ error: "Missing letter" }, { status: 400 });

    const { data: fw, error: fwErr } = await supabase
      .from("org_frameworks")
      .select("id,frequency_meta")
      .eq("org_id", ORG_ID)
      .maybeSingle();
    if (fwErr) return NextResponse.json({ error: fwErr.message }, { status: 500 });
    if (!fw) return NextResponse.json({ error: "No framework for org" }, { status: 404 });

    const meta = (fw.frequency_meta as any) || {};
    meta[letter] = {
      ...(meta[letter] || {}),
      ...(body.name ? { name: body.name } : {}),
      ...(body.image_url ? { image_url: body.image_url } : {}),
    };

    const { error: upErr } = await supabase
      .from("org_frameworks")
      .update({ frequency_meta: meta })
      .eq("id", fw.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  if (body.type === "profile") {
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const patch: Record<string, any> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.image_url !== undefined) patch.image_url = body.image_url;

    const { error: pErr } = await supabase.from("org_profiles").update(patch).eq("id", id);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
