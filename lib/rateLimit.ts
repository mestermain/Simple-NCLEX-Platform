/**
 * In-memory sliding rate limiter for authentication & high-stakes API actions.
 * Protects login endpoints from credential stuffing and automated brute-force attacks.
 */

interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number; message?: string } {
  const now = Date.now();
  const cleanKey = `login:${key.trim().toLowerCase()}`;
  const record = rateLimitStore.get(cleanKey);

  if (!record) {
    return { allowed: true };
  }

  // Check if currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: remainingSeconds,
      message: `Too many failed login attempts. Account protected. Please try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
    };
  }

  // Check if window expired
  if (now - record.firstAttemptAt > WINDOW_MS) {
    rateLimitStore.delete(cleanKey);
    return { allowed: true };
  }

  // Check if limit exceeded
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    rateLimitStore.set(cleanKey, record);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(BLOCK_DURATION_MS / 1000),
      message: 'Too many failed login attempts. Account temporarily locked for 15 minutes for security.',
    };
  }

  return { allowed: true };
}

export function recordFailedLoginAttempt(key: string): void {
  const now = Date.now();
  const cleanKey = `login:${key.trim().toLowerCase()}`;
  const record = rateLimitStore.get(cleanKey);

  if (!record || (now - record.firstAttemptAt > WINDOW_MS)) {
    rateLimitStore.set(cleanKey, {
      count: 1,
      firstAttemptAt: now,
    });
  } else {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_DURATION_MS;
    }
    rateLimitStore.set(cleanKey, record);
  }
}

export function resetLoginRateLimit(key: string): void {
  const cleanKey = `login:${key.trim().toLowerCase()}`;
  rateLimitStore.delete(cleanKey);
}
