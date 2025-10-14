// apps/portal/app/page.tsx
import Link from "next/link";
import type { Route } from "next";

const toRoute = (p: string) => p as unknown as Route;

export default function HomePage() {
  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold mb-4">MindCanvas Portal</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <Link className="underline" href={toRoute("/portal")}>
            Portal Dashboard
          </Link>
        </li>
        <li>
          <Link className="underline" href={toRoute("/admin/login")}>
            Admin Login
          </Link>
        </li>
        <li>
          <Link className="underline" href={toRoute("/health")}>
            Health
          </Link>
        </li>
        <li>
          <Link className="underline" href={toRoute("/test/demo")}>
            /test/demo
          </Link>
        </li>
      </ul>
    </main>
  );
}
