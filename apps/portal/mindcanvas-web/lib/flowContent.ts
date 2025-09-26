// lib/flowContent.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type FlowKey = "A" | "B" | "R" | "O";

export interface FlowContent {
  key: FlowKey;
  name: string;
  overview: string | null;
  strengths: string[];
  watchouts: string[];
  tips: string[];
  longform: string | null;
  color?: string | null;   // hex
  bg_from?: string | null; // gradient start
  bg_to?: string | null;   // gradient end
  icon?: string | null;    // emoji
}

function asStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

export async function getFlowContent(
  db: SupabaseClient,
  key: FlowKey
): Promise<FlowContent | null> {
  const { data, error } = await db
    .from("flows")
    .select("key,name,overview,strengths,watchouts,tips,longform,color,bg_from,bg_to,icon")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    key: data.key as FlowKey,
    name: String(data.name ?? ""),
    overview: asStr(data.overview),
    strengths: asArr(data.strengths),
    watchouts: asArr(data.watchouts),
    tips: asArr(data.tips),
    longform: asStr(data.longform),
    color: asStr(data.color),
    bg_from: asStr(data.bg_from),
    bg_to: asStr(data.bg_to),
    icon: asStr(data.icon),
  };
}
