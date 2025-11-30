// apps/web/app/api/portal/takers/bulk-export/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function POST(req: Request) {
  const form = await req.formData();
  const orgSlug = String(form.get("org") || "").trim();
  const idsRaw = form.getAll("ids").map((v) => String(v)).filter(Boolean);

  if (!orgSlug || idsRaw.length === 0) {
    const ref = req.headers.get("referer");
    return NextResponse.redirect(ref || `/portal/${orgSlug || ""}/database`);
  }

  const sb = createClient().schema("portal");

  const { data: org, error: orgErr } = await sb
    .from("orgs")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgErr || !org) {
    const ref = req.headers.get("referer");
    return NextResponse.redirect(ref || `/portal/${orgSlug || ""}/database`);
  }

  const { data, error } = await sb
    .from("test_takers")
    .select(
      "id, first_name, last_name, email, company, role_title, created_at"
    )
    .eq("org_id", org.id)
    .in("id", idsRaw);

  if (error || !data) {
    const ref = req.headers.get("referer");
    return NextResponse.redirect(ref || `/portal/${orgSlug || ""}/database`);
  }

  const rows = data.map((t: any) => ({
    id: t.id,
    first_name: t.first_name ?? "",
    last_name: t.last_name ?? "",
    email: t.email ?? "",
    company: t.company ?? "",
    role_title: t.role_title ?? "",
    created_at: t.created_at ?? "",
  }));

  const csv = toCSV(rows);
  const filename = `takers_${orgSlug}_selected.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
