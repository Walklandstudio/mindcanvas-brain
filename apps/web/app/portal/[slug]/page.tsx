// apps/web/app/portal/[slug]/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/app/_lib/portal";

export default async function Page({ params }: { params: { slug: string } }) {
  const sb = await getServerSupabase();
  const { slug } = params;

  const { data, error } = await sb
    .from("organizations")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  // If org not found, just go home
  if (error || !data) {
    redirect("/portal/home");
  }

  // Set a short-lived cookie so subsequent pages know the org
  const cs = await cookies();
  // @ts-ignore - set is available in server runtime
  cs.set("portal_org_id", data.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 });

  redirect("/portal/home");
}
