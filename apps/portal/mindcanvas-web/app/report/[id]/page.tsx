type PageProps = {
  params: { id: string };
  searchParams?: { [k: string]: string | string[] | undefined };
};

export default async function ReportPage({ params }: PageProps) {
  const { id } = params;

  // Example of typing fetched data (adjust to your shape)
  interface ReportData {
    id: string;
    title?: string;
    // add fields you actually use
  }

  // const data: ReportData = await fetch(...).then(r => r.json());

  return <div>Report #{id}</div>;
}
