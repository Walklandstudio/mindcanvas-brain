export type ProfileKey =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";

export function getProfileTitle(key: ProfileKey): string {
  const titles: Record<ProfileKey, string> = {
    P1: "Visionary", P2: "Spark", P3: "Anchor", P4: "Architect",
    P5: "Navigator", P6: "Producer", P7: "Connector", P8: "Analyst"
  };
  return titles[key] ?? "Profile";
}

export function getProfileSummary(key: ProfileKey): string {
  return `Summary for ${getProfileTitle(key)} — placeholder until CMS content is connected.`;
}

export default { getProfileTitle, getProfileSummary };
