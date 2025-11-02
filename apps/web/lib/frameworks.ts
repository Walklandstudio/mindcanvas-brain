// apps/web/lib/frameworks.ts
// Robust, server-only framework loader with flexible JSON shape support.
// Accepts either:
//   { framework: { name, frequencies: [...], profiles: [...] } }
// or
//   { name, frequencies: [...], profiles: [...] }
// and won't crash if arrays are missing (uses safe defaults).

import { readFile, access } from "fs/promises";
import path from "path";

export type FrequencyCode = "A" | "B" | "C" | "D";

export type Framework = {
  framework: {
    key: string;
    name: string;
    frequencies: { code: FrequencyCode; name: string; summary?: string }[];
    profiles: { code: string; slug?: string; name: string; frequencies: FrequencyCode[] }[];
  };
};

function normalizeBaseDir() {
  const override = process.env.FRAMEWORKS_DIR;
  if (override) return override;

  const cwd = process.cwd().replace(/\/+$/, "");
  const endsWithAppsWeb = /(?:^|\/)apps\/web$/.test(cwd);
  return endsWithAppsWeb
    ? path.join(cwd, "data", "frameworks")
    : path.join(cwd, "apps", "web", "data", "frameworks");
}

async function resolveFrameworkPath(fileName: string): Promise<string | null> {
  const base = normalizeBaseDir();
  const candidates = [
    path.join(base, fileName),
    path.join(process.cwd(), "data", "frameworks", fileName),
    path.join(process.cwd(), "apps", "web", "data", "frameworks", fileName),
  ];
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {}
  }
  return null;
}

/** Coerce org slug from various API shapes; fallback to env/default */
export function coerceOrgSlug(data: any): string {
  return (
    data?.orgSlug ||
    data?.org_slug ||
    data?.org?.slug ||
    (typeof data?.org === "string" ? data.org : undefined) ||
    process.env.DEFAULT_ORG_SLUG ||
    "competency-coach"
  );
}

// ---------- shape coercion helpers ----------

function asFreqCode(x: any): FrequencyCode {
  const c = String(x ?? "").trim().toUpperCase();
  return (["A", "B", "C", "D"] as FrequencyCode[]).includes(c as FrequencyCode)
    ? (c as FrequencyCode)
    : "A";
}

function defaultFrequencies(): { code: FrequencyCode; name: string }[] {
  return [
    { code: "A", name: "Frequency A" },
    { code: "B", name: "Frequency B" },
    { code: "C", name: "Frequency C" },
    { code: "D", name: "Frequency D" },
  ];
}

function coerceFrameworkShape(json: any): Framework {
  const root = json?.framework ?? json ?? {};
  const name: string =
    root.name ||
    json?.name ||
    json?.framework?.name ||
    process.env.DEFAULT_FRAMEWORK_NAME ||
    "Profile Test";

  // Frequencies: accept array of objects with {code,name} or {id,label,key}
  const rawFreqs: any[] = Array.isArray(root.frequencies) ? root.frequencies : [];
  const freqs =
    rawFreqs.length > 0
      ? rawFreqs.map((f: any, idx: number) => {
          const code: FrequencyCode =
            asFreqCode(f.code ?? f.id ?? f.key ?? (["A", "B", "C", "D"][idx] ?? "A"));
          const name = f.name ?? f.label ?? `Frequency ${code}`;
          const summary = f.summary ?? f.description ?? undefined;
          return { code, name, summary };
        })
      : defaultFrequencies();

  // Profiles: accept array with {code,name,frequencies} or try to derive frequency from code/name
  const rawProfiles: any[] = Array.isArray(root.profiles) ? root.profiles : [];
  const profiles =
    rawProfiles.length > 0
      ? rawProfiles.map((p: any) => {
          const code: string = String(p.code ?? p.id ?? p.key ?? p.slug ?? p.name ?? "").trim() || "P1";
          const name: string = p.name ?? p.label ?? code;
          let pfreqs: FrequencyCode[] = [];
          if (Array.isArray(p.frequencies) && p.frequencies.length) {
            pfreqs = p.frequencies.map((x: any) => asFreqCode(x));
          } else if (p.frequency) {
            pfreqs = [asFreqCode(p.frequency)];
          } else {
            // derive from first char of code if it looks like A1/B2...
            const derived = asFreqCode(code[0]);
            pfreqs = [derived];
          }
          return { code, slug: p.slug, name, frequencies: pfreqs };
        })
      : [
          { code: "A1", name: "A Profile 1", frequencies: ["A"] as FrequencyCode[] },
          { code: "B1", name: "B Profile 1", frequencies: ["B"] as FrequencyCode[] },
          { code: "C1", name: "C Profile 1", frequencies: ["C"] as FrequencyCode[] },
          { code: "D1", name: "D Profile 1", frequencies: ["D"] as FrequencyCode[] },
        ];

  return {
    framework: {
      key: (json?.framework?.key ?? json?.key ?? name.toLowerCase().replace(/\s+/g, "-")) as string,
      name,
      frequencies: freqs,
      profiles,
    },
  };
}

export async function loadFrameworkBySlug(orgSlug: string): Promise<Framework> {
  const safeSlug = (orgSlug || process.env.DEFAULT_ORG_SLUG || "competency-coach").trim();
  const fileName = `${safeSlug}.json`;

  const p = await resolveFrameworkPath(fileName);
  if (!p) {
    // Still return a valid default Framework instead of crashing
    return coerceFrameworkShape({
      name: "Profile Test",
      frequencies: defaultFrequencies(),
      profiles: [],
    });
  }
  const raw = await readFile(p, "utf-8");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed JSON → return defaults (prevents 500s)
    return coerceFrameworkShape({
      name: "Profile Test",
      frequencies: defaultFrequencies(),
      profiles: [],
    });
  }
  return coerceFrameworkShape(parsed);
}

/** Build lookups safely even if arrays are empty */
export function buildLookups(fw: Framework) {
  const freqs = Array.isArray(fw.framework?.frequencies) ? fw.framework.frequencies : [];
  const profs = Array.isArray(fw.framework?.profiles) ? fw.framework.profiles : [];

  const freqByCode = new Map<FrequencyCode, { code: FrequencyCode; name: string; summary?: string }>(
    freqs.map((f) => [f.code, f]),
  );
  const profileByCode = new Map<string, { code: string; slug?: string; name: string; frequencies: FrequencyCode[] }>(
    profs.map((p) => [p.code, p]),
  );

  const profilePrimaryFreq = new Map<string, FrequencyCode>(
    profs.map((p) => [p.code, (p.frequencies?.[0] ?? "A") as FrequencyCode]),
  );

  const profileNameToCode = new Map<string, string>(profs.map((p) => [p.name, p.code]));

  return { freqByCode, profileByCode, profilePrimaryFreq, profileNameToCode };
}
