export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

/* ---------- helpers also used in /tests/load ---------- */

async function ensureFramework(sb: any): Promise<{ id: string } | { error: string }> {
  const fw = await sb
    .from("org_frameworks")
    .select("id")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fw.error && fw.data?.id) return { id: fw.data.id as string };

  const shapes = [
    [{ org_id: ORG_ID, name: "Signature", version: 1 }],
    [{ org_id: ORG_ID, name: "Signature" }],
    [{ org_id: ORG_ID, version: 1 }],
    [{ org_id: ORG_ID }],
  ];
  let lastErr: string | null = null;
  for (const rows of shapes) {
    const ins = await sb.from("org_frameworks").insert(rows as any).select("id").single();
    if (!ins.error && ins.data?.id) return { id: ins.data.id as string };
    lastErr = ins.error?.message ?? lastErr;
  }
  return { error: lastErr || "failed to create org_frameworks row" };
}

async function ensureParentTest(sb: any): Promise<
  { parentTable: "org_test_defs" | "org_tests"; id: string; title: string; mode: string } | { error: string }
> {
  const probe = await sb.from("org_test_defs").select("id").limit(1);
  const useDefs = !(probe.error && /relation .* does not exist|42P01/i.test(probe.error.message));

  if (useDefs) {
    const fw = await ensureFramework(sb);
    if ("error" in fw) return { error: fw.error };

    const got = await sb
      .from("org_test_defs")
      .select("id,name,mode")
      .eq("org_id", ORG_ID)
      .eq("framework_id", fw.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!got.error && got.data?.id) {
      return {
        parentTable: "org_test_defs",
        id: got.data.id as string,
        title: got.data.name || "Profile Test",
        mode: got.data.mode || "full",
      };
    }

    const shapes = [
      [{ org_id: ORG_ID, framework_id: fw.id, name: "Signature Test", mode: "full" }],
      [{ org_id: ORG_ID, framework_id: fw.id, name: "Signature Test" }],
      [{ org_id: ORG_ID, framework_id: fw.id, mode: "full" }],
      [{ org_id: ORG_ID, framework_id: fw.id }],
    ];
    let lastErr: string | null = null;
    for (const rows of shapes) {
      const ins = await sb
        .from("org_test_defs")
        .insert(rows as any)
        .select("id,name,mode")
        .single();
      if (!ins.error && ins.data?.id) {
        return {
          parentTable: "org_test_defs",
          id: ins.data.id as string,
          title: ins.data.name || "Profile Test",
          mode: ins.data.mode || "full",
        };
      }
      lastErr = ins.error?.message ?? lastErr;
    }
    return { error: lastErr || "failed to create org_test_defs row" };
  }

  const got = await sb
    .from("org_tests")
    .select("id,name,mode")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!got.error && got.data?.id) {
    return {
      parentTable: "org_tests",
      id: got.data.id as string,
      title: got.data.name || "Profile Test",
      mode: got.data.mode || "full",
    };
  }

  const shapes = [
    [{ org_id: ORG_ID, name: "Signature Test", mode: "full" }],
    [{ org_id: ORG_ID, name: "Signature Test" }],
    [{ org_id: ORG_ID, mode: "full" }],
    [{ org_id: ORG_ID }],
  ];
  let lastErr: string | null = null;
  for (const rows of shapes) {
    const ins = await sb.from("org_tests").insert(rows as any).select("id,name,mode").single();
    if (!ins.error && ins.data?.id) {
      return {
        parentTable: "org_tests",
        id: ins.data.id as string,
        title: ins.data.name || "Profile Test",
        mode: ins.data.mode || "full",
      };
    }
    lastErr = ins.error?.message ?? lastErr;
  }
  return { error: lastErr || "failed to create org_tests row" };
}

function makeSlug(len = 8) {
  const c = "abcdefghkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

export async function POST(req: Request) {
  const sb = getServiceClient();
  try {
    const body = await req.json().catch(() => ({}));
    const modeReq: "free" | "full" = (body?.mode === "free" || body?.mode === "full") ? body.mode : "full";

    const parent = await ensureParentTest(sb);
    if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: 500 });

    const slug = makeSlug(8);

    const ins = await sb
      .from("test_deployments")
      .insert({
        org_id: ORG_ID,
        test_id: parent.id,
        slug,
        title: parent.title || "Profile Test",
        mode: modeReq || parent.mode || "full",
        status: "active",
      })
      .select("id,slug,title,mode")
      .single();

    if (ins.error || !ins.data) {
      return NextResponse.json({ error: ins.error?.message || "insert failed" }, { status: 500 });
    }

    const rec = ins.data; // non-null
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://mindcanvas-staging.vercel.app";
    const publicUrl = `${base}/t/${rec.slug}`;
    const embedUrl = `${base}/t/${rec.slug}/embed`;

    const embed_iframe = `<iframe src="${embedUrl}" width="100%" height="800" frameborder="0" allowfullscreen></iframe>`;
    const embed_script = `<iframe src="${embedUrl}" style="width:100%;height:800px;border:0" allowfullscreen></iframe>`;

    return NextResponse.json({
      ok: true,
      deployment_id: rec.id,
      slug: rec.slug,
      url: publicUrl,
      embed_iframe,
      embed_script,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "create/deploy failed" }, { status: 500 });
  }
}
