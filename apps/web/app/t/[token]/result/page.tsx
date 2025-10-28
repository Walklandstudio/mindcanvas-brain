export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ResultClient from './ResultClient';

export default function Page({ params }: { params: { token: string } }) {
  return <ResultClient token={params.token} />;
}

