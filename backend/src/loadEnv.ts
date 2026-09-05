// Imported before anything that reads process.env at module load time (e.g.
// app.ts's CORS_ORIGIN) — ES module imports are hoisted, so dotenv.config()
// must live in its own module evaluated first, not just an earlier statement
// in the same file as those reads.
import dotenv from 'dotenv';
dotenv.config();
