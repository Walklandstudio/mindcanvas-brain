// apps/web/app/api/portal/invites/create/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase, ensurePortalMember } from "@/app/_lib/portal";

export async function POST(req: Request) {
  const sb = await getServerSupabase();
  const orgId = await ensurePortalMember({ sb });

  const body = await req.json().catch(() => ({} as any));
  const email = String(body.email || "").trim().toLowerCase();
  const role = (body.role as string) || "client";

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // upsert invite
  const { data, error } = await sb
    .from("portal_invites")
    .upsert(
      {
        org_id: orgId,
        email,
        role,
        status: "pending",
      },
      { onConflict: "org_id,email" }
    )
    .select("id, token, status, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, invite: data }, { status: 200 });
}
