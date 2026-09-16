/**
 * One place that talks to OpenAI.
 *
 * Plain fetch rather than the SDK: the three things the site asks for (a chat
 * reply, a short pitch, one JSON extraction from a photo) are a single
 * chat-completions call each, and this keeps the deployed function small and
 * works with any OpenAI-compatible endpoint via OPENAI_BASE_URL.
 *
 * Models are configurable so a model can be changed without a code change:
 *   OPENAI_API_KEY       required
 *   OPENAI_BASE_URL      optional, defaults to OpenAI itself
 *   OPENAI_MODEL         optional, text replies (chat, pitch)
 *   OPENAI_VISION_MODEL  optional, must be a model that accepts images
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_VISION_MODEL = 'gpt-4o';
const TIMEOUT_MS = 45_000;

export class OpenAIError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export const textModel = () => process.env.OPENAI_MODEL || DEFAULT_MODEL;
export const visionModel = () => process.env.OPENAI_VISION_MODEL || DEFAULT_VISION_MODEL;

const apiKey = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAIError('OPENAI_API_KEY is not set.', 500);
  return key;
};

/** What a chat message carries: plain text, or text plus one image. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[];
}

export interface CompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask for JSON matching this schema — used by the product photo reader. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

/**
 * Turns an upstream failure into something the caller can act on. The key is
 * never echoed back: OpenAI's own message is used only for the model-not-found
 * case, where naming the model is what makes the error fixable.
 */
const describeFailure = (status: number, body: string, model: string): OpenAIError => {
  if (status === 401 || status === 403) {
    return new OpenAIError('The AI service rejected our API key. Check OPENAI_API_KEY.', 502);
  }
  if (status === 429) {
    return new OpenAIError('The AI service is rate limited or out of credit right now. Try again shortly.', 503);
  }
  if (status === 404 || /model/i.test(body)) {
    return new OpenAIError(`The AI service does not recognise the model "${model}". Set OPENAI_MODEL to one your account can use.`, 502);
  }
  return new OpenAIError('The AI service could not answer right now.', 502);
};

export const chatCompletion = async ({
  messages, model, temperature, maxTokens, jsonSchema,
}: CompletionOptions): Promise<string> => {
  const key = apiKey();
  const chosenModel = model || textModel();
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: chosenModel,
        messages,
        ...(temperature === undefined ? {} : { temperature }),
        ...(maxTokens === undefined ? {} : { max_completion_tokens: maxTokens }),
        ...(jsonSchema
          ? { response_format: { type: 'json_schema', json_schema: { name: jsonSchema.name, strict: true, schema: jsonSchema.schema } } }
          : {}),
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenAIError('The AI service took too long to answer.', 504);
    }
    throw new OpenAIError('Could not reach the AI service.', 502);
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  if (!response.ok) {
    console.error(`OpenAI ${response.status} for model ${chosenModel}: ${raw.slice(0, 400)}`);
    throw describeFailure(response.status, raw, chosenModel);
  }

  let parsed: { choices?: { message?: { content?: string } }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OpenAIError('The AI service returned something unreadable.', 502);
  }
  return parsed.choices?.[0]?.message?.content ?? '';
};

/** Express error reply for any AI route, so the three routes behave alike. */
export const sendAiError = (
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
  error: unknown,
) => {
  if (error instanceof OpenAIError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('AI route failed:', error);
  return res.status(500).json({ error: 'Something went wrong talking to the AI service.' });
};
