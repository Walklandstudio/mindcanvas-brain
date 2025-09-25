type ReportParams = { id: string };

export default async function ReportPage({
  params,
}: {
  params: Promise<ReportParams>;
}) {
  const { id } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Report #{id}</h1>
      {/* render report details here */}
    </main>
  );
}
