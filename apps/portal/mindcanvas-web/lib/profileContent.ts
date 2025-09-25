// lib/profileContent.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileContent = {
  key?: string | null;
  name?: string | null;
  frequency?: string | null;
  strengths: string[];
  watchouts: string[];   // aka challenges
  tips: string[];
  raw?: Record<string, unknown> | null;
};

function toList(x: unknown): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String).filter(Boolean);
  const s = String(x);
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}
  // split on newline or comma
  return s.split(/\r?\n|,/).map((t) => t.trim()).filter(Boolean);
}

/** Try to find profile by key (preferred) or by name */
export async function getProfileContent(
  db: SupabaseClient,
  keyOrName: string
): Promise<ProfileContent | null> {
  // 1) by key
  const byKey = await db.from("profiles").select("*").eq("key", keyOrName).limit(1).maybeSingle();
  if (!byKey.error && byKey.data) {
    const row = byKey.data as Record<string, unknown>;
    return {
      key: (row.key as string) ?? null,
      name: (row.name as string) ?? null,
      frequency: (row.frequency as string) ?? (row.freq as string) ?? null,
      strengths: toList(row.strengths ?? row.strength ?? row.strength_points),
      watchouts: toList(row.watchouts ?? row.challenges ?? row.weaknesses),
      tips: toList(row.tips ?? row.guidance ?? row.actions),
      raw: row,
    };
  }

  // 2) by name
  const byName = await db.from("profiles").select("*").eq("name", keyOrName).limit(1).maybeSingle();
  if (!byName.error && byName.data) {
    const row = byName.data as Record<string, unknown>;
    return {
      key: (row.key as string) ?? null,
      name: (row.name as string) ?? null,
      frequency: (row.frequency as string) ?? (row.freq as string) ?? null,
      strengths: toList(row.strengths ?? row.strength ?? row.strength_points),
      watchouts: toList(row.watchouts ?? row.challenges ?? row.weaknesses),
      tips: toList(row.tips ?? row.guidance ?? row.actions),
      raw: row,
    };
  }

  return null;
}
