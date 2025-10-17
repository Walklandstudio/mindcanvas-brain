import { NextResponse } from "next/server";
import { buildProfileCopy, draftReportSections } from "@/app/_lib/ai";

export const runtime = "nodejs";

type Body = {
  brandTone: string; industry: string; sector: string; company: string;
  frequencyName: string; profileName: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const copy = await buildProfileCopy({
      brandTone: body.brandTone,
      industry: body.industry,
      sector: body.sector,
      company: body.company,
      frequencyName: body.frequencyName,
      profileName: body.profileName,
    });

    const sections = await draftReportSections({
      brandTone: body.brandTone,
      industry: body.industry,
      sector: body.sector,
      company: body.company,
      frequencyName: body.frequencyName,
      profileName: body.profileName,
    });

    return NextResponse.json({
      summary: copy.summary,
      strengths: copy.strengths,
      sections,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Draft failed" }, { status: 400 });
  }
}
