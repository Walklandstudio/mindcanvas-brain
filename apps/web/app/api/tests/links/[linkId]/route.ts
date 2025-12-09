import { NextRequest } from "next/server";
import { sbAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * DELETE → hard-delete a test_link row by id
 * (This will invalidate the token so the link stops working.)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  const linkId = params.linkId;
  if (!linkId) return json(400, { ok: false, error: "missing_link_id" });

  const db = sbAdmin.schema("portal");

  const del = await db.from("test_links").delete().eq("id", linkId);

  if (del.error) {
    return json(200, { ok: false, error: del.error.message });
  }

  return json(200, { ok: true });
}
