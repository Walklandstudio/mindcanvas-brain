// apps/web/app/api/public/test/[token]/labels/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const sb = createClient().schema("portal");
  try {
    const token = (params?.token || "").trim();
    if (!token) return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });

    // Resolve test_id
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id")
      .eq("token", token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link) return NextResponse.json({ ok: false, error: "invalid link" }, { status: 404 });

    // IMPORTANT: These table names assume you created label tables per test.
    // If yours differ, rename here (but payload shape stays the same).
    const [{ data: profs }, { data: freqs }] = await Promise.all([
      sb.from("test_profile_labels").select("code, name").eq("test_id", link.test_id),
      sb.from("test_frequency_labels").select("code, name").eq("test_id", link.test_id),
    ]);

    const profileLabels: Record<string, string> = {};
    (profs || []).forEach((r) => (profileLabels[r.code] = r.name));

    const frequencyLabels: Record<string, string> = {};
    (freqs || []).forEach((r) => (frequencyLabels[r.code] = r.name));

    // sensible fallbacks
    for (const c of ["A1","A2","B1","B2","C1","C2","D1","D2"]) {
      profileLabels[c] ??= c;
    }
    for (const c of ["A","B","C","D"]) {
      frequencyLabels[c] ??= `Frequency ${c}`;
    }

    return NextResponse.json({ ok: true, data: { profileLabels, frequencyLabels } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
