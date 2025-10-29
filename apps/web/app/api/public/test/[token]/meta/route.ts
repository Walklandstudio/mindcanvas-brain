import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Helper: extract "1" from "PROFILE_1" / "P1" / "1"
function codeToProfileKey(code?: string | null) {
  if (!code) return null;
  const m = String(code).match(/(\d+)/);
  return m ? m[1] : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const sb = createClient().schema("portal");

    // 1) Resolve token -> test/org
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, test_id, org_id, token")
      .eq("token", token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Link not found" }, { status: 404 });

    const testId = link.test_id;

    // 2) Load optional label overrides (non-breaking)
    const [{ data: profLabels, error: plErr }, { data: freqLabels, error: flErr }] = await Promise.all([
      sb.from("test_profile_labels").select("*").eq("test_id", testId),
      sb.from("test_frequency_labels").select("*").eq("test_id", testId),
    ]);
    if (plErr) console.warn("[META] test_profile_labels read error:", plErr.message);
    if (flErr) console.warn("[META] test_frequency_labels read error:", flErr.message);

    // 3) Build default profiles (1..8 -> A,A,B,B,C,C,D,D)
    const defaults = [
      { code: "1", name: "Profile 1", frequency: "A" },
      { code: "2", name: "Profile 2", frequency: "A" },
      { code: "3", name: "Profile 3", frequency: "B" },
      { code: "4", name: "Profile 4", frequency: "B" },
      { code: "5", name: "Profile 5", frequency: "C" },
      { code: "6", name: "Profile 6", frequency: "C" },
      { code: "7", name: "Profile 7", frequency: "D" },
      { code: "8", name: "Profile 8", frequency: "D" },
    ];

    // 4) Apply profile label overrides if present
    let profiles = defaults;
    if (Array.isArray(profLabels) && profLabels.length > 0) {
      // normalize label rows by numeric profile code
      const profMap = new Map<string, { name?: string; frequency?: string }>();
      for (const row of profLabels) {
        const key = codeToProfileKey(row.profile_code) ?? String(row.profile_code);
        profMap.set(String(key), {
          name: row.profile_name || undefined,
          frequency: row.frequency_code || undefined,
        });
      }
      profiles = defaults.map((p) => {
        const over = profMap.get(String(p.code));
        return over
          ? { code: p.code, name: over.name ?? p.name, frequency: over.frequency ?? p.frequency }
          : p;
      });
    }

    // 5) Build default frequency names, then apply overrides if present
    const freqDefaults = [
      { code: "A", name: "Frequency A" },
      { code: "B", name: "Frequency B" },
      { code: "C", name: "Frequency C" },
      { code: "D", name: "Frequency D" },
    ];
    let frequencies = freqDefaults;
    if (Array.isArray(freqLabels) && freqLabels.length > 0) {
      const fmap = new Map<string, string>();
      for (const row of freqLabels) fmap.set(String(row.frequency_code), row.frequency_name);
      frequencies = freqDefaults.map((f) => ({
        code: f.code,
        name: fmap.get(f.code) || f.name,
      }));
    }

    // 6) Thresholds (optional). If you don't have this table, return []
    let thresholds: any[] = [];
    try {
      const { data: thr, error: thrErr } = await sb
        .from("test_thresholds")
        .select("*")
        .eq("test_id", testId);
      if (!thrErr && Array.isArray(thr)) thresholds = thr;
    } catch {
      thresholds = [];
    }

    return NextResponse.json({
      ok: true,
      test_id: testId,
      org_id: link.org_id,
      frequencies,
      profiles,
      thresholds,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

