// apps/web/app/api/portal/invites/create/route.ts
import { NextResponse } from "next/server";
import { ensurePortalMember } from "@/app/_lib/portal";

export async function POST(req: Request) {
  const { supabase, orgId } = await ensurePortalMember();
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { data, error } = await supabase.from("portal_invites").insert({
    org_id: orgId,
    email,
    role: "client",
    status: "pending",
  }).select("*").maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // TODO: send email with link to /portal/invite/accept?token=...
  return NextResponse.redirect("/portal/people", { status: 302 });
}
