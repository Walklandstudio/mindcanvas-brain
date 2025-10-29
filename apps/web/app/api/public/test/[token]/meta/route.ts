import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ProfileRow = { profile_code: string; profile_name?: string | null; frequency_code?: string | null };
type FreqRow = { frequency_code: string; frequency_name?: string | null };

function codeToProfileKey(code?: string | null) {
  if (!code) return null;
  const m = String(code).match(/(\d+)/);
  return m ? m[1] : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const sb = createClient().schema("portal");
  try {
    // 0) Resolve token → test
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, test_id, org_id, token")
      .eq("token", params.token)
      .maybeSingle();
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    if (!link)   return NextResponse.json({ ok: false, error: "Link not found" }, { status: 404 });

    const testId = link.test_id;

    // Will fill these progressively
    let profiles: { code: string; name: string; frequency: string }[] | null = null;
    let frequencies: { code: string; name: string }[] | null = null;

    // --- SOURCE 1: Dedicated label tables created by your importer ---
    // 1a) test_profiles
    try {
      const { data: tp } = await sb
        .from("test_profiles")
        .select("profile_code, profile_name, frequency_code")
        .eq("test_id", testId);
      if (tp && tp.length > 0) {
        profiles = tp
          .map((r: ProfileRow) => {
            const code = codeToProfileKey(r.profile_code) ?? String(r.profile_code);
            return {
              code,
              name: r.profile_name || `Profile ${code}`,
              frequency: r.frequency_code || "A",
            };
          })
          // keep only codes that look like 1..8 and sort by code numeric
          .filter(p => /^\d+$/.test(p.code))
          .sort((a, b) => Number(a.code) - Number(b.code));
      }
    } catch (_) { /* table may not exist – ignore */ }

    // 1b) test_frequencies
    try {
      const { data: tf } = await sb
        .from("test_frequencies")
        .select("frequency_code, frequency_name")
        .eq("test_id", testId);
      if (tf && tf.length > 0) {
        const map = new Map<string, string>();
        (tf as FreqRow[]).forEach((r) => map.set(String(r.frequency_code), r.frequency_name || `Frequency ${r.frequency_code}`));
        frequencies = ["A", "B", "C", "D"].map(code => ({ code, name: map.get(code) || `Frequency ${code}` }));
      }
    } catch (_) { /* table may not exist – ignore */ }

    // --- SOURCE 2: JSON definition on tests (definition/config/profiles/frequencies) ---
    if (!profiles || !frequencies) {
      try {
        const { data: testDef } = await sb
          .from("tests")
          .select("definition, config")
          .eq("id", testId)
          .maybeSingle();

        const def = testDef?.definition ?? testDef?.config ?? null;
        const defProfiles = def?.profiles as any[] | undefined;
        const defFreqs = def?.frequencies as any[] | undefined;

        if (!profiles && Array.isArray(defProfiles) && defProfiles.length) {
          profiles = defProfiles
            .map((p: any, idx: number) => {
              const code = codeToProfileKey(p.code) ?? String(p.code ?? idx + 1);
              const freq = p.frequency ?? p.freq ?? null;
              return {
                code,
                name: p.name || `Profile ${code}`,
                frequency: freq || "A",
              };
            })
            .filter(p => /^\d+$/.test(p.code))
            .sort((a, b) => Number(a.code) - Number(b.code));
        }

        if (!frequencies && Array.isArray(defFreqs) && defFreqs.length) {
          frequencies = ["A", "B", "C", "D"].map((code) => {
            const found = defFreqs.find((f: any) => (f.code || f.id) === code);
            return { code, name: (found?.name as string) || `Frequency ${code}` };
          });
        }
      } catch (_) { /* column may not exist – ignore */ }
    }

    // --- SOURCE 3: Infer from test_options (profile_map / profile_code / profile_name / frequency_code) ---
    if (!profiles) {
      try {
        const { data: opts } = await sb
          .from("test_options")
          .select("profile_map, profile_code, profile_name, frequency_code")
          .eq("test_id", testId)
          .limit(2000);

        if (opts && opts.length) {
          const seen = new Map<string, { name?: string; frequency?: string }>();
          for (const o of opts as any[]) {
            // Try map object first
            const map = o.profile_map || null;
            const codeFromMap = map ? codeToProfileKey(map.profile || map.code) : null;
            const code = codeFromMap ?? codeToProfileKey(o.profile_code) ?? null;
            if (!code) continue;

            const name =
              (map && (map.name as string)) ||
              (o.profile_name as string) ||
              undefined;

            const freq =
              (map && (map.frequency as string)) ||
              (o.frequency_code as string) ||
              undefined;

            if (!seen.has(code)) {
              seen.set(code, { name, frequency: freq });
            }
          }

          if (seen.size > 0) {
            profiles = Array.from(seen.entries())
              .map(([code, v]) => ({
                code,
                name: v.name || `Profile ${code}`,
                frequency: v.frequency || "A",
              }))
              .filter(p => /^\d+$/.test(p.code))
              .sort((a, b) => Number(a.code) - Number(b.code));
          }
        }
      } catch (_) { /* table may have different columns – ignore */ }
    }

    if (!frequencies && profiles) {
      // Build frequencies from whatever appears in profiles
      const set = new Set<string>();
      profiles.forEach((p) => p.frequency && set.add(p.frequency));
      const codes = (["A", "B", "C", "D"] as const).filter((c) => set.has(c));
      frequencies = (codes.length ? codes : ["A", "B", "C", "D"]).map((code) => ({
        code,
        name: `Frequency ${code}`,
      }));
    }

    // --- SOURCE 4: Last-resort defaults (won’t break UI if nothing above exists) ---
    if (!profiles) {
      profiles = [
        { code: "1", name: "Profile 1", frequency: "A" },
        { code: "2", name: "Profile 2", frequency: "A" },
        { code: "3", name: "Profile 3", frequency: "B" },
        { code: "4", name: "Profile 4", frequency: "B" },
        { code: "5", name: "Profile 5", frequency: "C" },
        { code: "6", name: "Profile 6", frequency: "C" },
        { code: "7", name: "Profile 7", frequency: "D" },
        { code: "8", name: "Profile 8", frequency: "D" },
      ];
    }

    if (!frequencies) {
      frequencies = [
        { code: "A", name: "Frequency A" },
        { code: "B", name: "Frequency B" },
        { code: "C", name: "Frequency C" },
        { code: "D", name: "Frequency D" },
      ];
    }

    // Thresholds: optional; return [] if table missing
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

    return NextResponse.json(
      { ok: true, test_id: testId, org_id: link.org_id, frequencies, profiles, thresholds },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

