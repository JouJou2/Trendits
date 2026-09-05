import cors from 'cors';
import express from 'express';
import { chatRouter } from './routes/chat.js';
import { elevatorPitchRouter } from './routes/elevatorPitch.js';
import { analyzeImageRouter } from './routes/analyzeImage.js';
import { twoFactorRouter } from './routes/twoFactor.js';
import { signupRouter } from './routes/signup.js';
import { ordersRouter } from './routes/orders.js';
import { rateLimit } from './rateLimit.js';
import { requireAuth } from './requireAuth.js';

export const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins }));
// Higher limit here to accommodate base64-encoded product images for /api/analyze-image
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/chat', rateLimit({ windowMs: 60_000, max: 20, name: 'chat' }), chatRouter);
app.use('/api/elevator-pitch', rateLimit({ windowMs: 60_000, max: 20, name: 'pitch' }), elevatorPitchRouter);
// Admin-only product import feature — it must not be an open Gemini proxy.
app.use('/api/analyze-image', rateLimit({ windowMs: 60_000, max: 10, name: 'image' }), requireAuth({ staffOnly: true }), analyzeImageRouter);
app.use('/api/2fa', rateLimit({ windowMs: 15 * 60_000, max: 10, name: '2fa' }), twoFactorRouter);
app.use('/api/signup', rateLimit({ windowMs: 15 * 60_000, max: 10, name: 'signup' }), signupRouter);
app.use('/api/orders', rateLimit({ windowMs: 60_000, max: 15, name: 'orders' }), ordersRouter);
