import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSupabase, getAdminClient } from "@/app/_lib/portal";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const sb = await getServerSupabase();
  const { data } = await sb.auth.getUser();

  if (!data?.user) {
    redirect("/portal/login?next=/admin");
  }

  const admin = await getAdminClient();
  const portal = admin.schema("portal");

  const { data: adminRow } = await portal
    .from("superadmin") // ✅ singular
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!adminRow?.user_id) {
    redirect("/portal");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050914", color: "white" }}>
      {children}
    </main>
  );
}

