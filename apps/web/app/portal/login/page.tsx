// apps/web/app/portal/login/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PortalLoginPage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-semibold">Client Portal Login</h1>
      <p className="mt-2 text-gray-600">
        Use your MindCanvas account or an invite link. If you’re already logged in,
        return to the <Link href="/portal/home" className="underline">Portal Home</Link>.
      </p>
      <div className="mt-6 space-y-3">
        {/* Replace with your actual auth UI (Supabase Auth UI / custom magic link form) */}
        <a href="/auth/signin" className="inline-block border px-4 py-2 rounded hover:bg-gray-50">
          Continue with Email
        </a>
        <a href="/auth/signin?provider=google" className="block text-sm underline">
          Continue with Google
        </a>
      </div>
    </div>
  );
}
