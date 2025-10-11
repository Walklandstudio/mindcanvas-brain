// apps/web/app/admin/reports/[id]/page.tsx
import ReportEditorClient from "./ReportEditorClient";
export const runtime = "nodejs";

// Your project enforces Promise-based params
type Params = Promise<{ id: string }>;
export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  return <ReportEditorClient id={id} />;
}
