// lib/profileContent.ts
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Flexible loader for profile metadata from your Supabase `profiles` table.
 * - Works whether you key by `code`, `key`, or `name`
 * - Accepts arrays, JSON objects, or comma/newline-separated strings
 * - Safe (no `any`) and resilient to different column names
 *
 * Usage:
 *   const pc = await getProfileContent(db, "P8");     // by code/key
 *   const pc = await getProfileContent(db, "Builder"); // by name
 */

export type ProfileContent = {
  /** Unique key or code for this profile (e.g., "P8"). */
  key: string | null;
  /** Optional separate code column if present. */
  code: string | null;
  /** Human-friendly name/title of the profile. */
  name: string | null;
  /** Frequency / flow label (e.g., "B", "Creator", etc.). */
  frequency: string | null;
  /** Bullet points of strengths. */
  strengths: string[];
  /** Bullet points of cautions / watch-outs. */
  watchouts: string[];
  /** Practical tips or guidance lines. */
  tips: string[];
  /** The full original row for debugging or future use. */
  raw: Record<string, unknown> | null;
};

export const DEFAULT_PROFILES_TABLE = "profiles";

/** Column synonyms this helper knows how to read. Adjust if your schema differs. */
const COLS = {
  key: ["key", "slug", "profile_key", "profile", "id", "code"],
  code: ["code", "profile_code", "key"],
  name: ["name", "title", "label", "display_name"],
  frequency: ["frequency", "freq", "flow", "primary_flow"],
  strengths: ["strengths", "strength", "strength_points", "pros"],
  watchouts: ["watchouts", "watch_outs", "challenges", "cons", "weaknesses"],
  tips: ["tips", "guidance", "advice", "actions", "recommendations"],
  // Some schemas nest fields under a JSON column like "content" or "data"
  nests: ["content", "data", "meta", "details"],
} as const;

/** ---------- Small utilities (no `any`) ---------- */

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return isObject(v) ? (v as Record<string, unknown>) : null;
}

function toList(src: unknown): string[] {
  if (src == null) return [];
  if (Array.isArray(src)) return src.map(String).map((s) => s.trim()).filter(Boolean);

  // JSON string?
  if (typeof src === "string") {
    const s = src.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).map((x) => x.trim()).filter(Boolean);
      // If not an array, fall through to delimiter split
    } catch {
      // not JSON — continue
    }
    // Split on newlines or commas
    return s
      .split(/\r?\n|,/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Generic object -> take its string values (best-effort)
  if (isObject(src)) {
    const out: string[] = [];
    for (const v of Object.values(src)) {
      if (v == null) continue;
      out.push(String(v).trim());
    }
    return out.filter(Boolean);
  }

  // number/boolean -> single item list
  return [String(src)];
}

function pickFirstString(row: Record<string, unknown>, candidates: readonly string[]): string | null {
  for (const k of candidates) {
    const v = row[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function pickFirstList(
  row: Record<string, unknown>,
  candidates: readonly string[],
  nestedHolders: readonly string[]
): string[] {
  // 1) direct columns first
  for (const k of candidates) {
    if (k in row) {
      const v = (row as Record<string, unknown>)[k];
      const list = toList(v);
      if (list.length) return list;
    }
  }
  // 2) try nested JSON holders like content.data.details
  for (const holder of nestedHolders) {
    const nest = asRecord(row[holder]);
    if (!nest) continue;
    for (const k of candidates) {
      const v = nest[k];
      const list = toList(v);
      if (list.length) return list;
    }
  }
  return [];
}

/** Case-insensitive equality helper (database query may be case-sensitive depending on collation). */
function equalsCI(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

/** ---------- Row normalization ---------- */

function normalizeProfileRow(row: Record<string, unknown>): ProfileContent {
  // Strings
  const name =
    pickFirstString(row, COLS.name) ??
    // sometimes nested (content.name / data.name)
    COLS.nests
      .map((h) => asRecord(row[h]))
      .map((r) => (r ? pickFirstString(r, COLS.name) : null))
      .find((v) => v) ??
    null;

  const code =
    pickFirstString(row, COLS.code) ??
    COLS.nests
      .map((h) => asRecord(row[h]))
      .map((r) => (r ? pickFirstString(r, COLS.code) : null))
      .find((v) => v) ??
    null;

  const key =
    pickFirstString(row, COLS.key) ??
    code ?? // fall back to code if key is absent
    (name && name.replace(/\s+/g, "-").toLowerCase()) ??
    null;

  const frequency =
    pickFirstString(row, COLS.frequency) ??
    COLS.nests
      .map((h) => asRecord(row[h]))
      .map((r) => (r ? pickFirstString(r, COLS.frequency) : null))
      .find((v) => v) ??
    null;

  // Lists
  const strengths = pickFirstList(row, COLS.strengths, COLS.nests);
  const watchouts = pickFirstList(row, COLS.watchouts, COLS.nests);
  const tips = pickFirstList(row, COLS.tips, COLS.nests);

  return {
    key,
    code,
    name,
    frequency,
    strengths,
    watchouts,
    tips,
    raw: row,
  };
}

/** ---------- Database lookups (no assumptions about exact column names) ---------- */

async function findByColumn(
  db: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<Record<string, unknown> | null> {
  const r = await db.from(table).select("*").eq(column, value).limit(1).maybeSingle();
  if (!r.error && r.data && isObject(r.data)) return r.data as Record<string, unknown>;
  return null;
}

async function findByColumnILike(
  db: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<Record<string, unknown> | null> {
  // Wrap in %value% to be tolerant of spacing/case; change to `${value}` for exact ci match.
  const r = await db.from(table).select("*").ilike(column, value);
  if (!r.error && Array.isArray(r.data) && r.data.length && isObject(r.data[0])) {
    // prefer exact case-insensitive equality among results
    const exact = r.data.find((row) => {
      const v = isObject(row) ? asString((row as Record<string, unknown>)[column]) : null;
      return v ? equalsCI(v, value) : false;
    });
    return (exact ?? (r.data[0] as Record<string, unknown>)) || null;
  }
  return null;
}

/**
 * Get a profile row by a provided key/name. Tries:
 *   1) exact match on code-like columns
 *   2) exact match on key-like columns
 *   3) exact match on name-like columns
 *   4) ilike on code/key/name (best-effort)
 */
async function findProfileRow(
  db: SupabaseClient,
  keyOrName: string,
  table: string
): Promise<Record<string, unknown> | null> {
  // 1) code columns
  for (const c of COLS.code) {
    const row = await findByColumn(db, table, c, keyOrName);
    if (row) return row;
  }
  // 2) key columns
  for (const c of COLS.key) {
    const row = await findByColumn(db, table, c, keyOrName);
    if (row) return row;
  }
  // 3) name columns
  for (const c of COLS.name) {
    const row = await findByColumn(db, table, c, keyOrName);
    if (row) return row;
  }
  // 4) ilike fallbacks (code/key/name)
  for (const c of [...COLS.code, ...COLS.key, ...COLS.name]) {
    const row = await findByColumnILike(db, table, c, keyOrName);
    if (row) return row;
  }
  return null;
}

/** ---------- Public API ---------- */

/**
 * Load profile content by `keyOrName` from `table` (default "profiles").
 * Returns `null` if not found. Maps common column names automatically.
 */
export async function getProfileContent(
  db: SupabaseClient,
  keyOrName: string,
  table: string = DEFAULT_PROFILES_TABLE
): Promise<ProfileContent | null> {
  const row = await findProfileRow(db, keyOrName, table);
  return row ? normalizeProfileRow(row) : null;
}

/**
 * Convenience: normalize a row you already fetched yourself.
 * (Useful if you join across tables and want to reuse this mapping.)
 */
export function normalizeProfileContentRow(row: Record<string, unknown>): ProfileContent {
  return normalizeProfileRow(row);
}

