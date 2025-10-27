// apps/web/pages/api/ping.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasRole = !!process.env.SUPABASE_SERVICE_ROLE;
  res.status(200).json({ ok: hasUrl && hasRole, hasUrl, hasRole });
}
