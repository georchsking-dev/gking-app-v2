import type { NextApiRequest } from 'next';

const GEORGIE_URL = (process.env.GEORGIE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const MAX_BODY_BYTES = 32 * 1024;

export function assertLocalRequest(req: NextApiRequest): void {
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
}

export async function georgieFetch(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${GEORGIE_URL}${path}`, { ...init, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...init.headers } });
  } finally { clearTimeout(timer); }
}
