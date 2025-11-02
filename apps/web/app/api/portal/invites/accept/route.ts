// apps/web/app/api/portal/invites/accept/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/_lib/portal";

export async function POST(req: Request) {
  const sb = await getServerSupabase();
  const { token, user_id } = await req.json().catch(() => ({} as any));

  if (!token || !user_id) {
    return NextResponse.json({ error: "token and user_id required" }, { status: 400 });
  }

  // find invite
  const { data: invite, error } = await sb
    .from("portal_invites")
    .select("id, org_id, email, role, status")
    .eq("token", token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!invite) return NextResponse.json({ error: "invalid invite" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "invite not pending" }, { status: 400 });
  }

  // add membership
  const { error: memErr } = await sb.from("portal_members").upsert({
    org_id: invite.org_id,
    user_id,
    role: invite.role ?? "client",
  });
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });

  // mark invite accepted
  const { error: updErr } = await sb
    .from("portal_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
