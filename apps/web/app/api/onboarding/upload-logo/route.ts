import { NextResponse } from "next/server";
import { getServiceClient } from "@/app/_lib/supabase";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });

  const supabase = getServiceClient();

  // Ensure bucket exists (no-op if it already does)
  try {
    await supabase.storage.createBucket("branding-logos", { public: true });
  } catch (_) {
    // ignore if it already exists
  }

  const arrbuf = await file.arrayBuffer();
  const path = `${randomUUID()}-${file.name}`.replace(/\s+/g, "_");

  const { error: upErr } = await supabase
    .storage
    .from("branding-logos")
    .upload(path, new Uint8Array(arrbuf), {
      contentType: file.type || "image/*",
      upsert: false
    });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from("branding-logos").getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl }, { status: 200 });
}
