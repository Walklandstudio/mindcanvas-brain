// apps/web/app/admin/reports/[id]/page.tsx
import ReportEditorClient from "./ReportEditorClient";

export const runtime = "nodejs";

export default function Page({ params }: { params: { id: string } }) {
  return <ReportEditorClient id={params.id} />;
}
