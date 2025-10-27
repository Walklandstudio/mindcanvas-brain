export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export default async function Dashboard({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!org)
    return (
      <div className="p-6 text-red-600">Organization not found: {slug}</div>
    );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">
        Client Portal — {org.name ?? slug}
      </h1>

      <div className="grid gap-4">
        <Link
          href={`/portal/${slug}/database`}
          className="px-3 py-2 rounded bg-white border hover:bg-gray-50"
        >
          View Test Taker Database →
        </Link>
        <Link
          href={`/portal/${slug}/tests`}
          className="px-3 py-2 rounded bg-white border hover:bg-gray-50"
        >
          Manage Tests →
        </Link>
      </div>
    </div>
  );
}
