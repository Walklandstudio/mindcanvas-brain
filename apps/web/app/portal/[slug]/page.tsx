// apps/web/app/portal/[slug]/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/app/_lib/portal";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await getServerSupabase();

  const { data, error } = await sb
    .from("organizations")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    redirect("/portal/home");
  }

  const cs = await cookies();
  // @ts-ignore `set` is available in the server runtime
  cs.set("portal_org_id", data.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 });

  redirect("/portal/home");
}
