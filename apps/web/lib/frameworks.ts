// apps/web/lib/frameworks.ts
// Server-only utilities to load an organisation's framework JSON by org slug.
// Filename must match the org slug, e.g. "competency-coach.json".

import { readFile } from "fs/promises";
import path from "path";

export type FrequencyCode = "A" | "B" | "C" | "D";

export type Framework = {
  framework: {
    key: string;
    name: string;
    // Example: [{ code: "A", name: "Frequency A", summary?: "..." }, ...]
    frequencies: { code: FrequencyCode; name: string; summary?: string }[];
    // Example: [{ code: "A1", name: "A Profile 1", frequencies: ["A"] }, ...]
    profiles: { code: string; slug?: string; name: string; frequencies: FrequencyCode[] }[];
    // Optional longform content store
    // reports?: Record<string, unknown>;
  };
};

export async function loadFramework(orgSlug: string): Promise<Framework> {
  const p = path.join(process.cwd(), "apps", "web", "data", "frameworks", `${orgSlug}.json`);
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as Framework;
}

/**
 * Build useful lookups (consistent names expected by pages).
 */
export function buildLookups(fw: Framework) {
  const freqByCode = new Map(fw.framework.frequencies.map(f => [f.code, f]));
  const profileByCode = new Map(fw.framework.profiles.map(p => [p.code, p]));

  // Primary frequency for each profile = first in its array
  const profilePrimaryFreq = new Map<string, FrequencyCode>(
    fw.framework.profiles.map(p => [p.code, (p.frequencies?.[0] ?? "A") as FrequencyCode]),
  );

  // Name → Code (for cases where totals are keyed by profile name)
  const profileNameToCode = new Map<string, string>(
    fw.framework.profiles.map(p => [p.name, p.code]),
  );

  return { freqByCode, profileByCode, profilePrimaryFreq, profileNameToCode };
}
