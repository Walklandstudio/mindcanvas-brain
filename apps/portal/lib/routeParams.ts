
export function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

export function asUUID(v: unknown): string {
  return asString(v);
}

export function asNumericId(v: unknown): number {
  const n = Number(asString(v));
  if (!Number.isFinite(n)) throw new Error("Invalid numeric id");
  return n;
}

/** New: matches existing imports in API routes */
export function extractParamFromUrl(url: string, name: string): string {
  try { return new URL(url).searchParams.get(name) ?? ""; } catch { return ""; }
}

/** New: matches existing imports in API routes */
export function extractIdFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return "";
  }
}

