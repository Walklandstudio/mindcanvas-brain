// apps/web/app/portal/layout.tsx
import { redirect } from "next/navigation";

/**
 * Root layout for all /portal routes.
 * This is intentionally public so that /portal/login and other
 * non-auth pages work correctly.
 *
 * Protected content lives under /portal/(app)/*
 * which has its own layout.tsx that enforces auth and membership.
 */

export const metadata = {
  title: "Client Portal | MindCanvas",
  description: "Login and access your MindCanvas client dashboard.",
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  // Feature flag gate (stops deployment from exposing unfinished portal)
  if (process.env.NEXT_PUBLIC_CLIENT_PORTAL !== "enabled") {
    redirect("/");
  }

  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#0b0f16] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
