import { Router } from 'express';
import { chatCompletion, sendAiError } from '../openai.js';

type ChatRequest = {
  systemInstruction?: string;
  conversationHistory?: string;
};

const router = Router();

router.post('/', async (req, res) => {
  const { systemInstruction, conversationHistory } = req.body as ChatRequest;

  if (!systemInstruction || !conversationHistory) {
    return res.status(400).json({ error: 'Missing systemInstruction or conversationHistory.' });
  }

  try {
    // The client sends the whole conversation as one transcript, so it goes in
    // as a single user turn with the shop rules as the system message.
    const text = await chatCompletion({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: conversationHistory },
      ],
      temperature: 0.5,
    });
    return res.json({ text });
  } catch (error) {
    return sendAiError(res, error);
  }
});

export const chatRouter = router;
