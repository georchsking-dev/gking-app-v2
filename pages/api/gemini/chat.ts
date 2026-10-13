import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'gemini-3.5-flash', systemInstruction, image } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Format contents for @google/genai
    const contents = messages.map((m: ChatMessage, idx: number) => {
      const parts: any[] = [{ text: m.text }];
      // If image is attached on the latest user message
      if (idx === messages.length - 1 && image && typeof image === 'string') {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          parts.unshift({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
        }
      }
      return {
        role: m.role === 'model' ? 'model' : 'user',
        parts,
      };
    });

    const validModels = [
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
    ];
    const chosenModel = validModels.includes(model) ? model : 'gemini-3.5-flash';

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents,
      config: {
        systemInstruction:
          systemInstruction ||
          'Eres Gemini, un modelo de inteligencia artificial de Google reflexivo, amigable, cálido y altamente capacitado. Responde con excelente formato markdown, código limpio y explicaciones claras.',
      },
    });

    const replyText = response.text || 'Sin respuesta.';

    return res.status(200).json({
      text: replyText,
      model: chosenModel,
    });
  } catch (error: any) {
    console.error('Gemini chat API error:', error);
    return res.status(500).json({
      error: error?.message || 'Error al comunicarse con Gemini',
    });
  }
}
