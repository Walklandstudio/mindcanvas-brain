type ReportPageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = params;

  // Example: fetch typed data if needed
  // interface ReportData { id: string; title?: string }
  // const data: ReportData = await fetch(...).then(r => r.json());

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Report #{id}</h1>
    </main>
  );
}
