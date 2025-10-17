export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "../../../../_lib/supabase";
import { draftReportSections } from "../../../../_lib/ai";

async function getOrgId() {
  const c = await cookies();                        // ⬅️ await here
  return c.get("mc_org_id")?.value ?? "00000000-0000-0000-0000-000000000001";
}

function getIdFromUrl(req: Request): string | null {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("reports");
  return i >= 0 && parts[i + 1] ? parts[i + 1] : null;
}

export async function GET(req: Request) {
  const sb = getServiceClient();
  const orgId = await getOrgId();
  const pid = getIdFromUrl(req);
  if (!pid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const prof = await sb
    .from("org_profiles")
    .select("id,name,frequency,framework_id,summary,strengths,image_url")
    .eq("id", pid)
    .eq("org_id", orgId)
    .maybeSingle();
  if (prof.error || !prof.data) {
    return NextResponse.json({ error: prof.error?.message || "profile not found" }, { status: 404 });
  }

  const fw = await sb
    .from("org_frameworks")
    .select("id,frequency_meta")
    .eq("id", prof.data.framework_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (fw.error) return NextResponse.json({ error: fw.error.message }, { status: 500 });

  const freqName =
    (fw.data?.frequency_meta as any)?.[prof.data.frequency]?.name ||
    `Frequency ${prof.data.frequency}`;

  const ensure = await sb
    .from("org_profile_reports")
    .upsert(
      {
        org_id: orgId,
        framework_id: prof.data.framework_id,
        profile_id: pid,
        sections: {
          summary: prof.data.summary ?? "",
          strengths: "",
          challenges: "",
          roles: "",
          guidance: "",
        },
        approved: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,framework_id,profile_id" }
    )
    .select("*")
    .maybeSingle();
  if (ensure.error) return NextResponse.json({ error: ensure.error.message }, { status: 500 });

  return NextResponse.json({
    profile: prof.data,
    frequencyName: freqName,
    report: ensure.data,
  });
}

export async function POST(req: Request) {
  const sb = getServiceClient();
  const orgId = await getOrgId();
  const pid = getIdFromUrl(req);
  if (!pid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "save";

  const prof = await sb
    .from("org_profiles")
    .select("name,frequency,framework_id")
    .eq("id", pid)
    .eq("org_id", orgId)
    .maybeSingle();
  if (prof.error || !prof.data) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  if (action === "draft") {
    const fw = await sb
      .from("org_frameworks")
      .select("frequency_meta")
      .eq("id", prof.data.framework_id)
      .eq("org_id", orgId)
      .maybeSingle();

    const { data: ob } = await sb
      .from("org_onboarding")
      .select("data")
      .eq("org_id", orgId)
      .maybeSingle();
    const od = (ob?.data as any) ?? {};
    const brandTone =
      od?.branding?.tone ?? od?.branding?.brandTone ?? "confident, modern, human";
    const industry = od?.company?.industry ?? od?.goals?.industry ?? "General";
    const sector   = od?.company?.sector   ?? od?.goals?.sector   ?? "General";
    const company  = od?.account?.companyName ?? od?.company?.name ?? "Company";

    const frequencyName =
      (fw.data?.frequency_meta as any)?.[prof.data.frequency]?.name ||
      `Frequency ${prof.data.frequency}`;

    const ai = (await draftReportSections({
      brandTone,
      industry,
      sector,
      company,
      frequencyName,
      profileName: prof.data.name,
    })) as any;

    const sections = {
      summary:
        (ai?.summary as string | undefined)?.trim() ||
        `${prof.data.name} — concise positioning based on ${frequencyName}.`,
      strengths: String(ai?.strengths ?? "• Drives progress\n• Collaborates well\n• Reliable execution"),
      challenges: String(ai?.challenges ?? "• Overextends at times\n• Needs clearer priorities"),
      roles: String(ai?.roles ?? "Ideal in roles that leverage these strengths and align to the frequency."),
      guidance: String(ai?.guidance ?? "Use practical rituals and artifacts to enable consistent performance."),
    };

    const upd = await sb
      .from("org_profile_reports")
      .upsert(
        {
          org_id: orgId,
          framework_id: prof.data.framework_id,
          profile_id: pid,
          sections: sections as any,
          approved: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,framework_id,profile_id" }
      );
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, sections });
  }

  if (action === "signoff") {
    const upd = await sb
      .from("org_profile_reports")
      .update({
        approved: true,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .eq("profile_id", pid);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, approved: true });
  }

  const body = await req.json().catch(() => ({}));
  const upd = await sb
    .from("org_profile_reports")
    .update({
      sections: {
        summary: String(body.summary ?? ""),
        strengths: String(body.strengths ?? ""),
        challenges: String(body.challenges ?? ""),
        roles: String(body.roles ?? ""),
        guidance: String(body.guidance ?? ""),
      } as any,
      approved: false,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("profile_id", pid);

  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
