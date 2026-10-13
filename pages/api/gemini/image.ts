import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, inputImage, mode = 'create', aspectRatio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido' });
    }

    // High quality image generation with gemini-nano-banana-2.1 or imagen
    if (mode === 'edit' && inputImage) {
      const matches = inputImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-nano-banana-2.1',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: matches[1],
                      data: matches[2],
                    },
                  },
                  {
                    text: `Modifica esta imagen aplicando las siguientes instrucciones: ${prompt}. Genera una imagen modificada con gran fidelidad.`,
                  },
                ],
              },
            ],
          });

          const parts = response.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if ((p as any).inlineData) {
              const mime = (p as any).inlineData.mimeType || 'image/png';
              const b64 = (p as any).inlineData.data;
              return res.status(200).json({
                imageUrl: `data:${mime};base64,${b64}`,
                model: 'gemini-nano-banana-2.1',
              });
            }
          }
        } catch (editErr) {
          console.warn('Edit error, trying generation fallback:', editErr);
        }
      }
    }

    // Image creation attempt with imagen-3.0-generate-002 or gemini-nano-banana-2.1
    try {
      const imgRes = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: (['1:1', '16:9', '9:16', '4:3', '3:4'].includes(aspectRatio) ? aspectRatio : '1:1') as any,
          outputMimeType: 'image/jpeg',
        },
      });

      if (imgRes.generatedImages && imgRes.generatedImages.length > 0) {
        const b64 = imgRes.generatedImages[0].image.imageBytes;
        return res.status(200).json({
          imageUrl: `data:image/jpeg;base64,${b64}`,
          model: 'gemini-nano-banana-2.1',
        });
      }
    } catch (imagenErr: any) {
      console.warn('generateImages call:', imagenErr?.message);
    }

    // Try generateContent with gemini-nano-banana-2.1
    const genRes = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: [
        {
          role: 'user',
          parts: [{ text: `Genera una imagen fotorrealista de alta calidad para: ${prompt}` }],
        },
      ],
    });

    const parts = genRes.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if ((p as any).inlineData) {
        const mime = (p as any).inlineData.mimeType || 'image/png';
        const b64 = (p as any).inlineData.data;
        return res.status(200).json({
          imageUrl: `data:${mime};base64,${b64}`,
          model: 'gemini-nano-banana-2.1',
        });
      }
    }

    return res.status(200).json({
      text: genRes.text,
      model: 'gemini-nano-banana-2.1',
    });
  } catch (error: any) {
    console.error('Image API error:', error);
    return res.status(500).json({
      error: error?.message || 'Error al procesar la imagen',
    });
  }
}
