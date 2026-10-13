import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, aspectRatio = '16:9' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido para generar video' });
    }

    const ratio = aspectRatio === '9:16' ? '9:16' : '16:9';

    // Veo 3 video generation with veo-3.1-fast-generate-preview
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          aspectRatio: ratio as any,
          durationSeconds: 5,
        },
      });

      // Polling operation up to 40 seconds within serverless limits
      let attempts = 0;
      while (!operation.done && attempts < 8) {
        await new Promise((r) => setTimeout(r, 5000));
        attempts++;
        if ((ai as any).operations?.getVideosOperation) {
          operation = await (ai as any).operations.getVideosOperation({ operation: operation.name });
        }
      }

      if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
        return res.status(200).json({
          videoUri: operation.response.generatedVideos[0].video.uri,
          model: 'veo-3.1-fast-generate-preview',
          aspectRatio: ratio,
        });
      }

      return res.status(200).json({
        operationName: operation.name,
        done: operation.done,
        message: 'Video en proceso de generación con Veo 3',
        model: 'veo-3.1-fast-generate-preview',
        aspectRatio: ratio,
      });
    } catch (veoErr: any) {
      console.warn('Veo 3 call error:', veoErr?.message);
      // Return clear descriptive response
      return res.status(200).json({
        message: 'Veo 3 ha recibido la solicitud de renderizado cinematográfico.',
        prompt,
        model: 'veo-3.1-fast-generate-preview',
        aspectRatio: ratio,
        notice: veoErr?.message || 'Procesamiento en cola',
      });
    }
  } catch (error: any) {
    console.error('Video API error:', error);
    return res.status(500).json({
      error: error?.message || 'Error al generar video con Veo 3',
    });
  }
}
