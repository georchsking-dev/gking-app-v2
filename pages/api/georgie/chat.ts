import type { NextApiRequest, NextApiResponse } from 'next';
import { assertLocalRequest, georgieFetch } from '~/modules/gking/georgie/georgie.server';

export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    assertLocalRequest(req);
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 20_000) return res.status(400).json({ error: 'Mensaje no válido.' });
    const upstream = await georgieFetch('/api/chat', { method: 'POST', body: JSON.stringify({ text, timeout_seconds: 120 }) }, 125_000);
    const data = await upstream.json();
    const audioMatch = typeof data.audio_url === 'string'
      ? data.audio_url.match(/^\/audio\/(georgie_response_[a-z0-9]+\.mp3)$/i)
      : null;
    if (audioMatch)
      data.audio_url = `/api/georgie/audio/${encodeURIComponent(audioMatch[1])}`;
    return res.status(upstream.status).json(data);
  } catch (error) {
    const timeout = error instanceof Error && error.name === 'AbortError';
    return res.status(timeout ? 504 : 503).json({ error: timeout ? 'Georgie agotó el tiempo de respuesta.' : 'Georgie no está disponible.' });
  }
}
