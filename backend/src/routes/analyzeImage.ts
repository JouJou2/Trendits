import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

type AnalyzeImageRequest = {
  imageBase64?: string;
  mimeType?: string;
};

const router = Router();

router.post('/', async (req, res) => {
  const { imageBase64, mimeType } = req.body as AnalyzeImageRequest;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
  }

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'Missing imageBase64 or mimeType.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: 'Analyze this product image and extract the following details in JSON format: title, brand, price (number), description, category (one of: electronics, fashion, home-living, groceries, beauty), stock (number, default 50). Only return valid JSON.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            brand: { type: Type.STRING },
            price: { type: Type.NUMBER },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            stock: { type: Type.NUMBER },
          },
          required: ['title', 'brand', 'price', 'description', 'category', 'stock'],
        },
      },
    });

    return res.json({ text: response.text || '{}' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export const analyzeImageRouter = router;
