// apps/web/app/_lib/dbMeta.ts
import { getServiceClient } from "./supabase";

/** Returns a Set of *actual* column names present on a table at runtime. */
export async function getTableColumns(table: string, schema = "public"): Promise<Set<string>> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .rpc("exec_sql", {
      sql: `
        select column_name
        from information_schema.columns
        where table_schema = $1 and table_name = $2
        order by ordinal_position
      `,
      params: [schema, table],
    } as any);

  // Fallback if you don't have a generic exec_sql RPC installed:
  // Try a direct select from information_schema via the service role:
  if (error || !Array.isArray(data)) {
    const alt = await supabase
      .from("information_schema.columns" as any)
      .select("column_name")
      .eq("table_schema", schema)
      .eq("table_name", table);
    if (alt.error) {
      throw new Error(`Failed to read table columns for ${schema}.${table}: ${alt.error.message}`);
    }
    return new Set((alt.data as any[]).map((r) => String(r.column_name)));
  }

  return new Set((data as any[]).map((r) => String(r.column_name)));
}

/** Keep only keys that exist on the table. Safe to use before inserts/updates. */
export function pickKnownColumns<T extends Record<string, any>>(row: T, columns: Set<string>): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(row)) {
    if (columns.has(k)) (out as any)[k] = v;
  }
  return out;
}

/** Map an array of rows through pickKnownColumns. */
export function mapKnownColumns<T extends Record<string, any>>(rows: T[], columns: Set<string>): Partial<T>[] {
  return rows.map((r) => pickKnownColumns(r, columns));
}
