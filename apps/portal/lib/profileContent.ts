// apps/portal/lib/profileContent.ts

// Keys used across the system for profile buckets
export type ProfileKey =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";

// Public shape expected by API routes (e.g. coach route)
export type ProfileContent = {
  title: string;
  summary: string;
  description?: string;
  bullets?: string[];
};

export function getProfileTitle(key: ProfileKey): string {
  const titles: Record<ProfileKey, string> = {
    P1: "Visionary",
    P2: "Spark",
    P3: "Anchor",
    P4: "Architect",
    P5: "Navigator",
    P6: "Producer",
    P7: "Connector",
    P8: "Analyst",
  };
  return titles[key] ?? "Profile";
}

export function getProfileSummary(key: ProfileKey): string {
  return `Summary for ${getProfileTitle(key)} — placeholder until CMS content is connected.`;
}

/**
 * Main accessor used by API routes.
 * Returns a stable shape that satisfies `ProfileContent`.
 */
export function getProfileContent(key: ProfileKey): ProfileContent {
  return {
    title: getProfileTitle(key),
    summary: getProfileSummary(key),
    // You can flesh these out later:
    description: undefined,
    bullets: undefined,
  };
}

// Default export for convenience
export default { getProfileTitle, getProfileSummary, getProfileContent };
