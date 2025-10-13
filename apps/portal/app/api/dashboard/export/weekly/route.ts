// app/api/dashboard/export/weekly/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type Row = { wk?: string; week?: string; tests?: number; total?: number };

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const baseEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = baseEnv || (host ? `${proto}://${host}` : "");

  const res = await fetch(`${origin}/api/dashboard/weekly`, { cache: "no-store" });
  const j = (await res.json()) as { rows?: Row[] } | Row[];

  const rows = Array.isArray(j) ? j : j.rows ?? [];
  const head = "week,tests";
  const lines = rows.map(r => `${csvEscape(String(r.wk ?? r.week ?? ""))},${String(r.tests ?? r.total ?? 0)}`);

  return new NextResponse([head, ...lines].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="weekly.csv"`,
    },
  });
}
