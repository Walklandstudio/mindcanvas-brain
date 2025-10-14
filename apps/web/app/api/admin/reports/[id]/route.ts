// apps/web/app/api/admin/reports/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";
import { draftReportSections } from "../../../../_lib/ai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Extract [id] from /api/admin/reports/[id] */
function getIdFromUrl(req: Request): string | null {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("reports");
  return i >= 0 && parts[i + 1] ? parts[i + 1] : null;
}

async function ensureReportRow(sb: any, pid: string, frameworkId: string) {
  const ex = await sb
    .from("org_profile_reports")
    .select("profile_id")
    .eq("profile_id", pid)
    .eq("org_id", ORG_ID)
    .maybeSingle();

  if (ex.error) throw new Error(ex.error.message);

  if (!ex.data) {
    const ins = await sb
      .from("org_profile_reports")
      .insert([{ profile_id: pid, org_id: ORG_ID, framework_id: frameworkId }])
      .select("profile_id")
      .maybeSingle();
    if (ins.error) throw new Error(ins.error.message);
  }
}

export async function GET(req: Request) {
  const sb = getServiceClient();
  const pid = getIdFromUrl(req);
  if (!pid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // Profile (get framework_id)
  const prof = await sb
    .from("org_profiles")
    .select("id,name,frequency,framework_id,summary,strengths,image_url,org_id")
    .eq("id", pid)
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (prof.error || !prof.data) {
    return NextResponse.json({ error: prof.error?.message || "profile not found" }, { status: 404 });
  }

  // Framework (for frequency names)
  const fw = await sb
    .from("org_frameworks")
    .select("id,frequency_meta")
    .eq("id", prof.data.framework_id)
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (fw.error) return NextResponse.json({ error: fw.error.message }, { status: 500 });

  const freqName =
    (fw.data?.frequency_meta as any)?.[prof.data.frequency]?.name ||
    `Frequency ${prof.data.frequency}`;

  // Org tone (branding/goals)
  const ob = await sb.from("org_onboarding").select("*").eq("org_id", ORG_ID).maybeSingle();
  const branding = (ob.data as any)?.branding ?? {};
  const goals = (ob.data as any)?.goals ?? {};
  const brandTone = branding?.brand_voice ?? branding?.tone ?? "confident, modern, human";
  const industry = goals?.industry ?? "";
  const sector = goals?.sector ?? "";
  const company = "Demo Org";

  // Ensure report row exists (NO upsert/onConflict)
  try {
    await ensureReportRow(sb, pid, prof.data.framework_id);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "ensure failed" }, { status: 500 });
  }

  // Load report
  const rep = await sb
    .from("org_profile_reports")
    .select("*")
    .eq("profile_id", pid)
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (rep.error) return NextResponse.json({ error: rep.error.message }, { status: 500 });

  return NextResponse.json({
    profile: prof.data,
    frequencyName: freqName,
    report:
      rep.data || {
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

export async function POST(req: Request) {
  const sb = getServiceClient();
  const pid = getIdFromUrl(req);
  if (!pid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "save";

  // Need framework_id
  const prof = await sb
    .from("org_profiles")
    .select("name,frequency,framework_id")
    .eq("id", pid)
    .eq("org_id", ORG_ID)
    .maybeSingle();
  if (prof.error || !prof.data) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  // Ensure row exists (NO upsert/onConflict)
  try {
    await ensureReportRow(sb, pid, prof.data.framework_id);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "ensure failed" }, { status: 500 });
  }

  if (action === "draft") {
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
      brandTone,
      industry,
      sector,
      company,
      frequencyName,
      profileName: prof.data.name,
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

  // default: save
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
