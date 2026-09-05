import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

type ElevatorPitchRequest = {
  productTitle?: string;
  productDescription?: string;
  brand?: string;
};

const router = Router();

router.post('/', async (req, res) => {
  const { productTitle, productDescription, brand } = req.body as ElevatorPitchRequest;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
  }

  if (!productTitle) {
    return res.status(400).json({ error: 'Missing productTitle.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert product marketer. Create a punchy, 2-sentence "elevator pitch" for this product that highlights its unique value proposition and why someone in Lebanon should want it. Product: ${productTitle} by ${brand || ''}. Description: ${productDescription || ''}. Keep it energetic and persuasive.`,
      config: {
        systemInstruction: 'Speak like a high-end luxury concierge. Be brief. Maximum 30 words.',
      },
    });

    return res.json({ text: response.text || '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export const elevatorPitchRouter = router;
