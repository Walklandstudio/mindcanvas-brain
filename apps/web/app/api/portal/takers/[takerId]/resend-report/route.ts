import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env
  .SUPABASE_SERVICE_ROLE_KEY as string;

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function POST(
  req: Request,
  { params }: { params: { takerId: string } }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Supabase env not configured" },
        { status: 500 }
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const portal = sb.schema("portal");

    const takerId = params.takerId;

    // 1) Load taker (needs email + link_token)
    const { data: taker, error: tkErr } = await portal
      .from("test_takers")
      .select("id, email, first_name, link_token")
      .eq("id", takerId)
      .maybeSingle();

    if (tkErr || !taker) {
      return NextResponse.json(
        { ok: false, error: tkErr?.message || "Test taker not found" },
        { status: 404 }
      );
    }

    if (!taker.email) {
      return NextResponse.json(
        { ok: false, error: "Test taker has no email address" },
        { status: 400 }
      );
    }

    if (!taker.link_token) {
      return NextResponse.json(
        { ok: false, error: "Test taker has no link token" },
        { status: 400 }
      );
    }

    // 2) Find the link record to reuse existing email endpoint
    const { data: link, error: linkErr } = await portal
      .from("test_links")
      .select("id")
      .eq("token", taker.link_token)
      .maybeSingle();

    if (linkErr || !link) {
      return NextResponse.json(
        { ok: false, error: linkErr?.message || "No link found for taker" },
        { status: 404 }
      );
    }

    const origin = getBaseUrl();

    // 3) Call the existing /api/links/[id]/email endpoint
    const res = await fetch(`${origin}/api/links/${link.id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmail: taker.email,
        toName: taker.first_name || undefined,
      }),
    });

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || (json && json.ok === false)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            json?.error ||
            `Email endpoint failed with status ${res.status}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
