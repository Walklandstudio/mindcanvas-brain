// app/report/[id]/page.tsx
type Props = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ReportPage({ params }: Props) {
  const { id } = params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Report #{id}</h1>
      {/* render report details here */}
    </main>
  );
}
