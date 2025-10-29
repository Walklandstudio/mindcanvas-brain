import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type AnyJson = Record<string, any> | null | undefined;

function pickFirst<T = any>(...vals: (T | null | undefined)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v!;
  return undefined;
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const sb = createClient().schema("portal");
  try {
    // Resolve token -> test
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, test_id, org_id, token")
      .eq("token", params.token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Link not found" }, { status: 404 });

    // Read any JSON blobs your importer might have written
    const { data: trow } = await sb
      .from("tests")
      .select("import_json, definition, config, meta")
      .eq("id", link.test_id)
      .maybeSingle();

    const blob = (pickFirst<AnyJson>(
      trow?.import_json,
      trow?.definition,
      trow?.config,
      trow?.meta
    ) || {}) as Record<string, any>;

    // Frequencies: [{ code: "A", label: "Innovation" }, ...]
    const freqArr = Array.isArray(blob.frequencies) ? blob.frequencies : [];
    const frequencies =
      freqArr.length > 0
        ? freqArr.map((f: any) => ({
            code: String(f.code ?? "").toUpperCase(),
            name: String(f.label ?? f.name ?? `Frequency ${f.code ?? ""}`),
          }))
        : [
            { code: "A", name: "Frequency A" },
            { code: "B", name: "Frequency B" },
            { code: "C", name: "Frequency C" },
            { code: "D", name: "Frequency D" },
          ];

    // Profiles: [{ code: "PROFILE_1", name: "Visionary", frequency: "A", ... }]
    const profArr = Array.isArray(blob.profiles) ? blob.profiles : [];
    const profiles =
      profArr.length > 0
        ? profArr.map((p: any, idx: number) => ({
            code: String(p.code ?? `PROFILE_${idx + 1}`), // preserve PROFILE_1 etc.
            name: String(p.name ?? `Profile ${idx + 1}`),
            frequency: String(p.frequency ?? "A").toUpperCase(),
          }))
        : [
            { code: "PROFILE_1", name: "Profile 1", frequency: "A" },
            { code: "PROFILE_2", name: "Profile 2", frequency: "A" },
            { code: "PROFILE_3", name: "Profile 3", frequency: "B" },
            { code: "PROFILE_4", name: "Profile 4", frequency: "B" },
            { code: "PROFILE_5", name: "Profile 5", frequency: "C" },
            { code: "PROFILE_6", name: "Profile 6", frequency: "C" },
            { code: "PROFILE_7", name: "Profile 7", frequency: "D" },
            { code: "PROFILE_8", name: "Profile 8", frequency: "D" },
          ];

    // Optional thresholds (your JSON has them under thresholds.*)
    let thresholds: any[] = [];
    if (blob.thresholds && typeof blob.thresholds === "object") {
      thresholds = [{ ...blob.thresholds }]; // keep as single payload object in an array for now
    } else {
      // If you later migrate to a table, keep this try/catch:
      try {
        const { data: thr, error: thrErr } = await sb
          .from("test_thresholds")
          .select("*")
          .eq("test_id", link.test_id);
        if (!thrErr && Array.isArray(thr)) thresholds = thr;
      } catch {}
    }

    return NextResponse.json(
      {
        ok: true,
        test_id: link.test_id,
        org_id: link.org_id,
        frequencies,
        profiles,
        thresholds,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

