// lib/routeParams.ts
export function extractParamFromUrl(u: string, segment: string): string {
  try {
    const { pathname } = new URL(u);
    const parts = pathname.split("/").filter(Boolean);
    const idx = parts.indexOf(segment);
    return idx >= 0 && idx + 1 < parts.length
      ? decodeURIComponent(parts[idx + 1])
      : "";
  } catch {
    return "";
  }
}
export const extractIdFromUrl = (u: string) => extractParamFromUrl(u, "submissions");
export const extractSlugFromUrl = (u: string) => extractParamFromUrl(u, "tests");

export function extractParams(
  u: string,
  mapping: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, seg] of Object.entries(mapping)) out[k] = extractParamFromUrl(u, seg);
  return out;
}
