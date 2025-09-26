// mindcanvas-web/lib/profileContent.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type FlowLabel =
  | "Catalyst Coaching Flow"
  | "Communications Coaching Flow"
  | "Rhythmic Coaching Flow"
  | "Observer Coaching Flow";

export interface ProfileContent {
  code: string;
  name: string;
  flow: FlowLabel | null;
  overview: string | null;
  strengths: string[];
  watchouts: string[];
  tips: string[];
  // longform
  welcome_long: string | null;
  introduction_long: string | null;
  competencies_long: string | null;
}

type Selector = "code" | "name";

function asStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}
function normalizeRow(row: Record<string, unknown> | null): ProfileContent | null {
  if (!row) return null;
  return {
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    flow: (row.flow as FlowLabel) ?? null,
    overview: asStr(row.overview),
    strengths: asArr(row.strengths),
    watchouts: asArr(row.watchouts),
    tips: asArr(row.tips),
    welcome_long: asStr(row.welcome_long),
    introduction_long: asStr(row.introduction_long),
    competencies_long: asStr(row.competencies_long),
  };
}

/**
 * DB-backed helper.  ⬅️  This is the signature the whole app should use.
 * getProfileContent(db, key, selector?)
 */
export async function getProfileContent(
  db: SupabaseClient,
  key: string,
  selector: Selector = "code"
): Promise<ProfileContent | null> {
  const cols =
    "code,name,flow,overview,strengths,watchouts,tips,welcome_long,introduction_long,competencies_long";

  if (selector === "name") {
    const { data, error } = await db
      .from("profiles")
      .select(cols)
      .ilike("name", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeRow(data);
  }

  const { data, error } = await db
    .from("profiles")
    .select(cols)
    .eq("code", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalizeRow(data);
}
