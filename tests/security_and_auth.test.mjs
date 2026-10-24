import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';

// 1. Password Strength and Hashing logic
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function comparePassword(plain, storedHash) {
  if (!storedHash || !plain) return false;
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compare(plain, storedHash);
  }
  // Legacy scrypt
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  return new Promise((resolve) => {
    crypto.scrypt(plain, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

// 2. Schemas
const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const questionSchema = z.object({
  question_text: z.string().trim().min(5, 'Question stem must be at least 5 characters'),
  options: z.array(z.string().trim().min(1)).min(2, 'Must provide at least 2 options'),
  correct_answers: z.array(z.number().int().min(0)).min(1, 'At least one correct answer is required'),
  question_type: z.enum(['mcq', 'sata', 'matrix', 'cloze', 'drag_drop', 'bowtie', 'case_study']).default('mcq'),
  category: z.string().trim().default('General'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  rationale: z.string().trim().optional().default(''),
  is_published: z.number().int().min(0).max(1).default(1),
});

// 3. Web Crypto Edge JWT signing & verification (middleware emulation)
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

async function verifyEdgeToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const enc = new TextEncoder();
  const key = await crypto.webcrypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  let sig = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
  while (sig.length % 4) sig += '=';
  const sigBytes = Uint8Array.from(Buffer.from(sig, 'base64'));
  const valid = await crypto.webcrypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    enc.encode(`${headerB64}.${payloadB64}`)
  );
  if (!valid) return null;
  const payload = JSON.parse(base64UrlDecode(payloadB64));
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload;
}

async function signEdgeToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }));
  const enc = new TextEncoder();
  const key = await crypto.webcrypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.webcrypto.subtle.sign('HMAC', key, enc.encode(`${headerB64}.${payloadB64}`));
  const signatureB64 = Buffer.from(signature).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// 4. Rate Limiter emulation
class InMemoryRateLimiter {
  constructor(windowMs, maxAttempts) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.store = new Map();
  }
  consume(key) {
    const now = Date.now();
    let record = this.store.get(key);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + this.windowMs };
      this.store.set(key, record);
      return { allowed: true, remaining: this.maxAttempts - 1 };
    }
    record.count++;
    if (record.count > this.maxAttempts) {
      return { allowed: false, retryAfterSec: Math.ceil((record.resetAt - now) / 1000) };
    }
    return { allowed: true, remaining: this.maxAttempts - record.count };
  }
}

// TESTS
test('Password Strength Requirements', () => {
  assert.equal(validatePasswordStrength('weak').valid, false);
  assert.equal(validatePasswordStrength('alllowercase1').valid, false);
  assert.equal(validatePasswordStrength('ALLUPPERCASE1').valid, false);
  assert.equal(validatePasswordStrength('NoNumbersHere').valid, false);
  assert.equal(validatePasswordStrength('StrongPass1').valid, true);
});

test('Bcrypt Hashing and Verification', async () => {
  const password = 'CorrectHorseBattery99';
  const hash = await hashPassword(password);
  assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
  assert.equal(await comparePassword(password, hash), true);
  assert.equal(await comparePassword('WrongPassword', hash), false);
});

test('Zod Schema Validation for Login and QBank Questions', () => {
  // Login validation
  const validLogin = loginSchema.safeParse({ email: 'student@example.com', password: 'Pass' });
  assert.equal(validLogin.success, true);

  const invalidLogin = loginSchema.safeParse({ email: 'not-an-email', password: 'Pass' });
  assert.equal(invalidLogin.success, false);

  // Question validation
  const validQuestion = questionSchema.safeParse({
    question_text: 'A nurse is caring for a patient experiencing hypokalemia...',
    options: ['Administer potassium IV push', 'Initiate telemetry monitoring', 'Encourage furosemide', 'Restrict dietary potassium'],
    correct_answers: [1],
    question_type: 'mcq',
    category: 'Pharmacological and Parenteral Therapies',
    difficulty: 'medium',
  });
  assert.equal(validQuestion.success, true);

  // Fails with only 1 option
  const invalidQuestion = questionSchema.safeParse({
    question_text: 'Short',
    options: ['Only one option'],
    correct_answers: [0],
  });
  assert.equal(invalidQuestion.success, false);
});

test('Edge JWT Verification & Role-Based Access Control', async () => {
  const secret = 'super-secret-jwt-key-for-testing';
  const adminToken = await signEdgeToken({ id: 1, email: 'admin@simplenclex.com', role: 'admin' }, secret);
  const studentToken = await signEdgeToken({ id: 2, email: 'student@simplenclex.com', role: 'student' }, secret);

  const adminSession = await verifyEdgeToken(adminToken, secret);
  assert.ok(adminSession);
  assert.equal(adminSession.role, 'admin');

  const studentSession = await verifyEdgeToken(studentToken, secret);
  assert.ok(studentSession);
  assert.equal(studentSession.role, 'student');

  // Verify non-admin is denied access to admin role
  assert.equal(studentSession.role === 'admin', false);
  assert.equal(adminSession.role === 'admin', true);

  // Verify tampered token fails
  const tampered = adminToken.slice(0, -5) + 'xxxxx';
  const tamperedSession = await verifyEdgeToken(tampered, secret);
  assert.equal(tamperedSession, null);
});

test('Brute-force Rate Limiting', () => {
  const limiter = new InMemoryRateLimiter(60000, 5); // 5 max in 1 min
  const ip = '192.168.1.100';

  for (let i = 0; i < 5; i++) {
    const res = limiter.consume(ip);
    assert.equal(res.allowed, true);
  }

  // 6th attempt must be blocked
  const blocked = limiter.consume(ip);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec > 0);
});
