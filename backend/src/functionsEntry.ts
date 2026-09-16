import { onRequest } from 'firebase-functions/v2/https';
import { app } from './app.js';

// No dotenv here: Cloud Functions v2 loads .env.<project-id> into process.env
// automatically before this module runs. OPENAI_API_KEY, RESEND_API_KEY,
// RESEND_FROM_EMAIL, and CORS_ORIGIN all come from that file at deploy time.
export const api = onRequest(app);
