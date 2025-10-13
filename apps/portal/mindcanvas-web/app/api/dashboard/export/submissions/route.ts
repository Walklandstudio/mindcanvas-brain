// app/api/dashboard/export/submissions/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Row = {
  id: string;
  taken_at: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_profile_code: string | null;
  full_frequency: string | null;
  test_id: string | null;
};

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCSV(rows: Row[]): string {
  const head = [
    "id","taken_at","email","first_name","last_name","profile","frequency","test_id"
  ].join(",");
  const lines = rows.map(r => [
    r.id,
    r.taken_at ?? "",
    r.email ?? "",
    r.first_name ?? "",
    r.last_name ?? "",
    r.full_profile_code ?? "",
    r.full_frequency ?? "",
    r.test_id ?? ""
  ].map(v => csvEscape(String(v))).join(","));
  return [head, ...lines].join("\n");
}

export async function GET() {
  const db = supabaseServer();
  const { data, error } = await db
    .from("mc_submissions")
    .select("id,taken_at,email,first_name,last_name,full_profile_code,full_frequency,test_id")
    .order("taken_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCSV((data ?? []) as Row[]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="submissions.csv"`,
    },
  });
}
