// apps/web/lib/frameworks.ts
// Robust, server-only framework loader. Handles Vercel cwd quirks and missing slugs safely.

import { readFile, access } from "fs/promises";
import path from "path";

export type FrequencyCode = "A" | "B" | "C" | "D";

export type Framework = {
  framework: {
    key: string;
    name: string;
    frequencies: { code: FrequencyCode; name: string; summary?: string }[];
    profiles: { code: string; slug?: string; name: string; frequencies: FrequencyCode[] }[];
    // reports?: Record<string, unknown>;
  };
};

function normalizeBaseDir() {
  // Prefer an explicit override if you want to change location without code edits.
  const override = process.env.FRAMEWORKS_DIR;
  if (override) return override;

  // On Vercel, CWD during app execution is typically "/var/task" or "/var/task/apps/web".
  // If we're already in apps/web, don't add it again.
  const cwd = process.cwd();
  const clean = cwd.replace(/\/+$/, "");
  const endsWithAppsWeb = /(?:^|\/)apps\/web$/.test(clean);
  return endsWithAppsWeb
    ? path.join(clean, "data", "frameworks")
    : path.join(clean, "apps", "web", "data", "frameworks");
}

/**
 * Try a few candidate paths (future-proof for bundler/cwd differences).
 */
async function resolveFrameworkPath(fileName: string): Promise<string | null> {
  const base = normalizeBaseDir();
  const candidates = [
    path.join(base, fileName),                                    // preferred
    path.join(process.cwd(), "data", "frameworks", fileName),     // if cwd is apps/web
    path.join(process.cwd(), "apps", "web", "data", "frameworks", fileName), // if cwd is repo root
  ];
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * Coerce org slug from various possible API shapes.
 * Falls back to DEFAULT_ORG_SLUG (env) or "competency-coach".
 */
export function coerceOrgSlug(data: any): string {
  return (
    data?.orgSlug ||
    data?.org_slug ||
    data?.org?.slug ||
    data?.org ||
    process.env.DEFAULT_ORG_SLUG ||
    "competency-coach"
  );
}

export async function loadFrameworkBySlug(orgSlug: string): Promise<Framework> {
  const slug = (orgSlug || "").trim();
  const safeSlug = slug || process.env.DEFAULT_ORG_SLUG || "competency-coach";
  const fileName = `${safeSlug}.json`;

  const p = await resolveFrameworkPath(fileName);
  if (!p) {
    throw new Error(
      `Framework JSON not found for slug "${safeSlug}". Looked under ${normalizeBaseDir()}`
    );
  }
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as Framework;
}

/**
 * Build consistent lookups.
 */
export function buildLookups(fw: Framework) {
  const freqByCode = new Map(fw.framework.frequencies.map(f => [f.code, f]));
  const profileByCode = new Map(fw.framework.profiles.map(p => [p.code, p]));

  const profilePrimaryFreq = new Map<string, FrequencyCode>(
    fw.framework.profiles.map(p => [p.code, (p.frequencies?.[0] ?? "A") as FrequencyCode])
  );

  const profileNameToCode = new Map<string, string>(
    fw.framework.profiles.map(p => [p.name, p.code])
  );

  return { freqByCode, profileByCode, profilePrimaryFreq, profileNameToCode };
}
