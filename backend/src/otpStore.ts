interface PendingCode {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 30 * 1000;
export const MAX_ATTEMPTS = 5;

export const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

type VerifyResult = { ok: true } | { ok: false; status: number; error: string };

// In-memory is fine here: single-instance service, and a restart just means an
// in-flight code has to be re-requested — not a data-loss concern.
export class OtpStore {
  private codes = new Map<string, PendingCode>();

  // Returns seconds to wait if still in cooldown, or null if a new code can be sent.
  checkCooldown(key: string): number | null {
    const existing = this.codes.get(key);
    if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      return Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000);
    }
    return null;
  }

  issue(key: string): string {
    const code = generateCode();
    this.codes.set(key, { code, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0, lastSentAt: Date.now() });
    return code;
  }

  verify(key: string, code: string): VerifyResult {
    const pending = this.codes.get(key);
    if (!pending) {
      return { ok: false, status: 400, error: 'No pending code. Please request a new one.' };
    }
    if (Date.now() > pending.expiresAt) {
      this.codes.delete(key);
      return { ok: false, status: 400, error: 'Code expired. Please request a new one.' };
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      this.codes.delete(key);
      return { ok: false, status: 429, error: 'Too many incorrect attempts. Please request a new code.' };
    }
    if (pending.code !== code.trim()) {
      pending.attempts += 1;
      return { ok: false, status: 400, error: `Incorrect code. ${MAX_ATTEMPTS - pending.attempts} attempt(s) left.` };
    }
    this.codes.delete(key);
    return { ok: true };
  }
}
