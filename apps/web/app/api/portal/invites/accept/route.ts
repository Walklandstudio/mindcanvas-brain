// apps/web/app/api/portal/invites/accept/route.ts
import { NextResponse } from "next/server";
import { ensurePortalMember } from "@/app/_lib/portal";

export async function POST(req: Request) {
  // Requires the user to be logged in; alternatively, allow token-only then sign-in.
  const { supabase } = await ensurePortalMember();
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const { data: invite } = await supabase
    .from("portal_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "invalid or used token" }, { status: 400 });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  // Add membership
  const { error } = await supabase.from("portal_members").upsert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role ?? "client",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mark invite accepted
  await supabase.from("portal_invites").update({ status: "accepted" }).eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
