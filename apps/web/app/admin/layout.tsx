// apps/web/app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

type AdminLayoutProps = {
  children: ReactNode;
};

async function createServerSupabaseClient() {
  // In your Next setup, cookies() returns a Promise, so we await it
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Supabase auth-helpers normally manage this for you, but here we
  // manually read the access token from cookies and forward it so that:
  //  - auth.getUser() works server-side
  //  - RLS (auth.uid()) is evaluated against the logged-in user
  const accessToken = cookieStore.get("sb-access-token")?.value;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : {},
  });

  return client;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createServerSupabaseClient();

  // 1) Ensure there is a logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // Not logged in → send them to login, then back to /admin afterwards
    redirect("/login?redirect=/admin");
  }

  // 2) Check if this user is a superadmin in portal.superadmin
  const { data: superRow, error: superError } = await supabase
    .from("superadmin")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (superError || !superRow) {
    // Logged in, but not a platform owner → no access
    redirect("/");
  }

  // 3) They are a superadmin → render the admin shell
  return (
    <main style={{ minHeight: "100vh", background: "#050914", color: "white" }}>
      {children}
    </main>
  );
}
