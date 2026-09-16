import { Router } from 'express';
import { chatCompletion, sendAiError } from '../openai.js';

type ElevatorPitchRequest = {
  productTitle?: string;
  productDescription?: string;
  brand?: string;
};

const router = Router();

router.post('/', async (req, res) => {
  const { productTitle, productDescription, brand } = req.body as ElevatorPitchRequest;

  if (!productTitle) {
    return res.status(400).json({ error: 'Missing productTitle.' });
  }

  try {
    const text = await chatCompletion({
      messages: [
        { role: 'system', content: 'Speak like a high-end luxury concierge. Be brief. Maximum 30 words.' },
        {
          role: 'user',
          content: `You are an expert product marketer. Create a punchy, 2-sentence "elevator pitch" for this product that highlights its unique value proposition and why someone in Lebanon should want it. Product: ${productTitle} by ${brand || ''}. Description: ${productDescription || ''}. Keep it energetic and persuasive.`,
        },
      ],
      temperature: 0.7,
      maxTokens: 200,
    });
    return res.json({ text });
  } catch (error) {
    return sendAiError(res, error);
  }
});

export const elevatorPitchRouter = router;
