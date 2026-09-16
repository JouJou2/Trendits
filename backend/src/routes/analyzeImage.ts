import { Router } from 'express';
import { chatCompletion, sendAiError, visionModel } from '../openai.js';

type AnalyzeImageRequest = {
  imageBase64?: string;
  mimeType?: string;
};

const router = Router();

/** The product fields the importer fills in from a photo. */
const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    brand: { type: 'string' },
    price: { type: 'number' },
    description: { type: 'string' },
    category: { type: 'string', enum: ['electronics', 'fashion', 'home-living', 'groceries', 'beauty'] },
    stock: { type: 'number' },
  },
  required: ['title', 'brand', 'price', 'description', 'category', 'stock'],
  additionalProperties: false,
};

router.post('/', async (req, res) => {
  const { imageBase64, mimeType } = req.body as AnalyzeImageRequest;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'Missing imageBase64 or mimeType.' });
  }

  try {
    const text = await chatCompletion({
      model: visionModel(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this product image and extract the product details. If a price is not visible, estimate a sensible one. Use 50 for stock unless the image says otherwise.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      jsonSchema: { name: 'product_details', schema: PRODUCT_SCHEMA },
    });

    return res.json({ text: text || '{}' });
  } catch (error) {
    return sendAiError(res, error);
  }
});

export const analyzeImageRouter = router;
