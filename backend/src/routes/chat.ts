import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

type ChatRequest = {
  systemInstruction?: string;
  conversationHistory?: string;
};

const router = Router();

router.post('/', async (req, res) => {
  const { systemInstruction, conversationHistory } = req.body as ChatRequest;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
  }

  if (!systemInstruction || !conversationHistory) {
    return res.status(400).json({ error: 'Missing systemInstruction or conversationHistory.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: conversationHistory,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    return res.json({ text: response.text || '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export const chatRouter = router;
