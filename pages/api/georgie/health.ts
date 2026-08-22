import type { NextApiRequest, NextApiResponse } from 'next';
import { georgieFetch } from '~/modules/gking/georgie/georgie.server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    const upstream = await georgieFetch('/api/health', {}, 6_000);
    return res.status(upstream.status).json(await upstream.json());
  } catch { return res.status(503).json({ status: 'offline', service: 'georgie', ollama: false }); }
}
