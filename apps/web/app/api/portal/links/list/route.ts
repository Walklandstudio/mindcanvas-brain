import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Minimal admin client, pinned to the `portal` schema */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  });
}

/** Resolve org id from cookies (id first, then slug→lookup) */
async function getActiveOrgId(
  sb: ReturnType<typeof getAdminClient>
): Promise<string | null> {
  const c = await cookies(); // Next 15 can be async here
  const byId = c.get("active_org_id")?.value?.trim();
  if (byId) return byId;

  const slug = c.get("active_org_slug")?.value?.trim();
  if (!slug) return null;

  const { data } = await sb
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

type LinkRow = {
  id: string;
  token: string;
  test_id: string;
  use_count: number | null;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string | null;
};

type TestRow = { id: string; name: string | null };

export async function GET() {
  try {
    const sb = getAdminClient();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) return NextResponse.json({ links: [] }, { status: 200 });

    const { data: links, error } = await sb
      .from("test_links")
      .select("id, token, test_id, use_count, max_uses, expires_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows: LinkRow[] = (Array.isArray(links) ? links : []) as LinkRow[];

    // Enrich with test names (optional)
    const testIds = Array.from(new Set(rows.map((l: LinkRow) => l.test_id)));
    const nameById = new Map<string, string>();
    if (testIds.length) {
      const { data: tests } = await sb
        .from("tests")
        .select("id, name")
        .in("id", testIds);
      (tests as TestRow[] | null | undefined)?.forEach((t) => {
        nameById.set(t.id, (t.name ?? "").trim());
      });
    }

    const out = rows.map((l: LinkRow) => ({
      ...l,
      test_name: nameById.get(l.test_id) ?? "",
    }));

    return NextResponse.json({ links: out }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
