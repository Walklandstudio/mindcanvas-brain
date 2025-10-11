// apps/web/app/api/admin/reports/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import { draftReportSections } from "../../../../_lib/ai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const sb = getServiceClient();
  const pid = ctx.params.id;

  // Profile & framework context (includes framework_id)
  const prof = await sb
    .from("org_profiles")
    .select("id,name,frequency,framework_id,summary,strengths,image_url,org_id")
    .eq("id", pid)
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (prof.error || !prof.data) {
    return NextResponse.json({ error: prof.error?.message || "profile not found" }, { status: 404 });
  }

  const fw = await sb
    .from("org_frameworks")
    .select("id,frequency_meta")
    .eq("id", prof.data.framework_id)
    .eq("org_id", ORG_ID)
    .maybeSingle();

  const freqName =
    (fw.data?.frequency_meta as any)?.[prof.data.frequency]?.name ||
    `Frequency ${prof.data.frequency}`;

  // Onboarding tone
  const ob = await sb.from("org_onboarding").select("*").eq("org_id", ORG_ID).maybeSingle();
  const branding = (ob.data as any)?.branding ?? {};
  const goals = (ob.data as any)?.goals ?? {};
  const brandTone = branding?.brand_voice ?? branding?.tone ?? "confident, modern, human";
  const industry = goals?.industry ?? "";
  const sector = goals?.sector ?? "";
  const company = "Demo Org";

  // Ensure report row exists with org_id + framework_id
  const ensure = await sb
    .from("org_profile_reports")
    .upsert(
      { profile_id: pid, org_id: ORG_ID, framework_id: prof.data.framework_id },
      { onConflict: "profile_id" }
    )
    .select("*")
    .eq("profile_id", pid)
    .maybeSingle();
  if (ensure.error) return NextResponse.json({ error: ensure.error.message }, { status: 500 });

  return NextResponse.json({
    profile: prof.data,
    frequencyName: freqName,
    report: ensure.data || {
      profile_id: pid,
      org_id: ORG_ID,
      framework_id: prof.data.framework_id,
      strengths: "",
      challenges: "",
      roles: "",
      guidance: "",
      approved: false,
    },
    context: { brandTone, industry, sector, company },
  });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const sb = getServiceClient();
  const pid = ctx.params.id;
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "save";

  // Fetch profile once to get framework_id
  const prof = await sb
    .from("org_profiles")
    .select("name,frequency,framework_id")
    .eq("id", pid)
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (prof.error || !prof.data) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  // Ensure row with org_id + framework_id
  const ensured = await sb
    .from("org_profile_reports")
    .upsert(
      { profile_id: pid, org_id: ORG_ID, framework_id: prof.data.framework_id },
      { onConflict: "profile_id" }
    )
    .select("profile_id")
    .maybeSingle();
  if (ensured.error) return NextResponse.json({ error: ensured.error.message }, { status: 500 });

  if (action === "draft") {
    // Framework + onboarding to shape AI
    const fw = await sb
      .from("org_frameworks")
      .select("frequency_meta")
      .eq("id", prof.data.framework_id)
      .eq("org_id", ORG_ID)
      .maybeSingle();

    const ob = await sb.from("org_onboarding").select("*").eq("org_id", ORG_ID).maybeSingle();
    const branding = (ob.data as any)?.branding ?? {};
    const goals = (ob.data as any)?.goals ?? {};
    const brandTone = branding?.brand_voice ?? branding?.tone ?? "confident, modern, human";
    const industry = goals?.industry ?? "";
    const sector = goals?.sector ?? "";
    const company = "Demo Org";

    const frequencyName =
      (fw.data?.frequency_meta as any)?.[prof.data.frequency]?.name ||
      `Frequency ${prof.data.frequency}`;

    const draft = await draftReportSections({
      brandTone, industry, sector, company,
      frequencyName, profileName: prof.data.name,
    });

    const upd = await sb
      .from("org_profile_reports")
      .update({
        ...draft,
        approved: false,
        org_id: ORG_ID,
        framework_id: prof.data.framework_id,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", pid)
      .eq("org_id", ORG_ID);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, draft });
  }

  if (action === "signoff") {
    const upd = await sb
      .from("org_profile_reports")
      .update({
        approved: true,
        org_id: ORG_ID,
        framework_id: prof.data.framework_id,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", pid)
      .eq("org_id", ORG_ID);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, approved: true });
  }

  // default: save draft
  const body = await req.json().catch(() => ({}));
  const upd = await sb
    .from("org_profile_reports")
    .update({
      strengths: String(body.strengths ?? ""),
      challenges: String(body.challenges ?? ""),
      roles: String(body.roles ?? ""),
      guidance: String(body.guidance ?? ""),
      approved: false,
      org_id: ORG_ID,
      framework_id: prof.data.framework_id,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", pid)
    .eq("org_id", ORG_ID);

  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
