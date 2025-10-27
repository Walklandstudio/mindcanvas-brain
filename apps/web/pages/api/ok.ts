// apps/web/pages/api/ok.ts
import type { NextApiRequest, NextApiResponse } from 'next';
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).send('pages-api-ok');
}
