// apps/web/app/portal/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "MindCanvas — Client Portal",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_CLIENT_PORTAL !== "enabled") redirect("/");

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/portal/home" className="font-semibold">Client Portal</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/portal/home" className="hover:underline">Home</Link>
            <Link href="/portal/tests" className="hover:underline">Tests</Link>
            <Link href="/portal/people" className="hover:underline">People</Link>
            <Link href="/portal/submissions" className="hover:underline">Submissions</Link>
            <Link href="/portal/settings" className="hover:underline">Settings</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
