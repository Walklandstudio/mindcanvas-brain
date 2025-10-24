import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  try {
    const { data: link, error: linkError } = await supabase
      .from("test_links")
      .select("*, test:tests(id, org_id, name, slug, is_active)")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      console.error("Link not found", linkError);
      return NextResponse.json(
        { error: "Link not found or invalid token" },
        { status: 404 }
      );
    }

    if (!link.test?.is_active) {
      return NextResponse.json(
        { error: "Test is not active" },
        { status: 410 }
      );
    }

    // Increment link use
    const { error: incrementError } = await supabase.rpc(
      "increment_test_link_use",
      { link_token: token }
    );
    if (incrementError)
      console.error("increment_test_link_use error", incrementError);

    // Create taker record
    const { data: taker, error: takerError } = await supabase
      .from("test_takers")
      .insert({
        link_token: token,
        test_id: link.test.id,
        org_id: link.test.org_id,
        status: "started",
      })
      .select()
      .single();

    if (takerError)
      return NextResponse.json(
        { error: "Error creating test taker", details: takerError.message },
        { status: 500 }
      );

    return NextResponse.json({
      ok: true,
      startPath: `/t/${token}`,
      test: {
        id: link.test.id,
        name: link.test.name,
        slug: link.test.slug,
      },
      link,
      taker,
    });
  } catch (err: any) {
    console.error("Unexpected error", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
