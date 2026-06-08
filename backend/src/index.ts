import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { chatRouter } from './routes/chat.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/chat', chatRouter);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
