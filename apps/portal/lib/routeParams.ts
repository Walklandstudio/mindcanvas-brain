export function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

export function asUUID(v: unknown): string {
  const s = asString(v);
  // naive check; replace with zod if you like
  return s;
}

export function asNumericId(v: unknown): number {
  const n = Number(asString(v));
  if (!Number.isFinite(n)) throw new Error("Invalid numeric id");
  return n;
}
