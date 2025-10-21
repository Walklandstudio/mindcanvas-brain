// apps/web/app/api/portal/invites/create/route.ts
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";
import { getActiveOrgId } from "@/app/_lib/portal";

export async function POST(req: Request) {
  const sb = supabaseAdmin();

  // Determine org (allow override via ?orgId=... if you want to target another org)
  const url = new URL(req.url);
  const orgOverride = url.searchParams.get("orgId");
  const orgId = orgOverride || (await getActiveOrgId());
  if (!orgId) {
    return new Response(JSON.stringify({ ok: false, error: "No active org found" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Parse body
  const body = (await req.json().catch(() => ({}))) as any;
  const email = String(body.email || "").trim().toLowerCase();
  const role = (body.role as string) || "member"; // or "manager" if you prefer
  const invited_by = body.invited_by || null;     // optional; keep null if unknown

  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: "Email required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Upsert into portal_invites (idempotent per-org+email if you added a unique)
  const { data, error } = await sb
    .from("portal_invites")
    .upsert([{ org_id: orgId, email, role, invited_by }], {
      onConflict: "org_id,email",
    })
    .select("id, org_id, email, role")
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, invite: data }), {
    headers: { "content-type": "application/json" },
  });
}
