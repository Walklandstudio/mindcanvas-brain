// apps/web/app/api/portal/links/delete/route.ts
import { NextResponse } from "next/server";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

/**
 * POST /api/portal/links/delete
 * body: { id?: string, token?: string }
 * Deletes a test_link for the active org (by id OR token).
 */
export async function POST(req: Request) {
  try {
    const sb = await getAdminClient();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) {
      return NextResponse.json({ ok: false, error: "No active org" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const id = (body.id || "").trim();
    const token = (body.token || "").trim();
    if (!id && !token) {
      return NextResponse.json({ ok: false, error: "Provide id or token" }, { status: 400 });
    }

    const q = sb.from("test_links").delete().eq("org_id", orgId);
    const del = id ? await q.eq("id", id) : await q.eq("token", token);

    if (del.error) {
      return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: del.count ?? 1 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
