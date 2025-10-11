// apps/web/app/admin/test-builder/TestBuilderFooter.tsx
"use client";

export default function TestBuilderFooter() {
  return (
    <div className="mt-10 flex items-center justify-between">
      <div className="text-white/70 text-sm">
        When you’re happy with the questions and answer wording, continue to report preview & approval.
      </div>
      <a
        href="/admin/reports/signoff"
        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium"
      >
        Proceed to Report Sign-off →
      </a>
    </div>
  );
}
