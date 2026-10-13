import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const {
    messages,
    model = 'gemini-3.5-flash',
    systemInstruction,
    nineRouter,
    image,
  } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Mensajes requeridos' });
  }

  // If 9Router Proxy is enabled and has endpoint
  if (nineRouter && nineRouter.enabled && nineRouter.endpoint) {
    try {
      let endpoint = nineRouter.endpoint.trim().replace(/\/+$/, '');
      if (!endpoint.endsWith('/chat/completions') && !endpoint.endsWith('/v1')) {
        endpoint = `${endpoint}/chat/completions`;
      } else if (endpoint.endsWith('/v1')) {
        endpoint = `${endpoint}/chat/completions`;
      }

      const oaiMessages = [];
      if (systemInstruction) {
        oaiMessages.push({ role: 'system', content: systemInstruction });
      }

      for (const m of messages) {
        if (m.image) {
          oaiMessages.push({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: [
              { type: 'text', text: m.text },
              { type: 'image_url', image_url: { url: m.image } },
            ],
          });
        } else {
          oaiMessages.push({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text,
          });
        }
      }

      const proxyRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(nineRouter.apiKey ? { Authorization: `Bearer ${nineRouter.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: oaiMessages,
          stream: false,
        }),
      });

      if (!proxyRes.ok) {
        const errText = await proxyRes.text();
        throw new Error(`9Router error (${proxyRes.status}): ${errText}`);
      }

      const data = await proxyRes.json();
      const replyText = data.choices?.[0]?.message?.content || data.reply || 'Sin respuesta de 9Router.';
      return res.status(200).json({
        text: replyText,
        model,
        provider: '9Router Proxy',
      });
    } catch (err: any) {
      console.warn('9Router call failed, falling back to Gemini API:', err?.message);
      // fallback to direct Gemini below if 9router error
    }
  }

  // Direct Gemini execution
  try {
    const contents = messages.map((m: any, idx: number) => {
      const parts: any[] = [{ text: m.text }];
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
          'Eres Gemini, un modelo de IA de Google amigable, empático, reflexivo y altamente capacitado. Responde en español con excelente formato markdown, código limpio y explicaciones claras.',
      },
    });

    return res.status(200).json({
      text: response.text || 'Sin respuesta.',
      model: chosenModel,
      provider: 'Gemini Direct',
    });
  } catch (error: any) {
    console.error('Gemini chat API error:', error);
    return res.status(500).json({
      error: error?.message || 'Error al comunicarse con Gemini',
    });
  }
}
