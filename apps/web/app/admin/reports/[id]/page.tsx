// apps/web/app/admin/reports/[id]/page.tsx
import ReportEditorClient from "./ReportEditorClient";

export const runtime = "nodejs";

// If your project enforces Promise-based params, keep this shape:
type Params = Promise<{ id: string }>;
export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  return <ReportEditorClient id={id} />;
}
