import type { NextApiRequest, NextApiResponse } from 'next';

type ClientErrorReport = {
  receivedAt: string;
  message: string;
  stack?: string;
  componentStack?: string;
};

const globalWithGeorgieError = globalThis as typeof globalThis & {
  __georgieClientError?: ClientErrorReport;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const host = req.headers.host?.split(':')[0];
  if (host !== '127.0.0.1' && host !== 'localhost')
    return res.status(403).json({ error: 'Solo disponible localmente.' });

  if (req.method === 'GET')
    return res.status(200).json(globalWithGeorgieError.__georgieClientError ?? null);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  globalWithGeorgieError.__georgieClientError = {
    receivedAt: new Date().toISOString(),
    message: String(body.message ?? 'Error desconocido').slice(0, 2_000),
    stack: typeof body.stack === 'string' ? body.stack.slice(0, 20_000) : undefined,
    componentStack: typeof body.componentStack === 'string' ? body.componentStack.slice(0, 20_000) : undefined,
  };

  return res.status(204).end();
}
