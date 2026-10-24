import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Q-Bank Navigation: Navbar links to /qbank with label "Q-Bank"', () => {
  const navbarContent = fs.readFileSync(path.join(ROOT_DIR, 'components/Navbar.tsx'), 'utf-8');
  assert.ok(
    navbarContent.includes("{ name: 'Q-Bank', href: '/qbank' }"),
    'Navbar navLinks should include "Q-Bank" pointing to /qbank'
  );
  assert.ok(
    navbarContent.includes("pathname?.startsWith('/app')"),
    'Navbar should suppress marketing header on /app routes'
  );
});

test('Footer and Cookie Notice: Suppressed on /app routes', () => {
  const footerContent = fs.readFileSync(path.join(ROOT_DIR, 'components/Footer.tsx'), 'utf-8');
  assert.ok(
    footerContent.includes("pathname?.startsWith('/app')"),
    'Footer should suppress marketing footer on /app routes'
  );

  const cookieContent = fs.readFileSync(path.join(ROOT_DIR, 'components/CookieNotice.tsx'), 'utf-8');
  assert.ok(
    cookieContent.includes("pathname?.startsWith('/app')"),
    'CookieNotice should be suppressed on /app routes'
  );
});

test('/qbank Marketing Page: Server-rendered with all mandatory sections', () => {
  const pagePath = path.join(ROOT_DIR, 'app/qbank/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'app/qbank/page.tsx must exist');
  
  const content = fs.readFileSync(pagePath, 'utf-8');
  
  // Must NOT be client component (server-rendered)
  assert.ok(!content.startsWith("'use client'"), 'app/qbank/page.tsx should be a Server Component');

  // Must export metadata with own title and description
  assert.ok(content.includes('export const metadata: Metadata'), 'Must export page metadata');
  assert.ok(content.includes('title:'), 'Metadata must specify title');
  assert.ok(content.includes('description:'), 'Metadata must specify description');

  // Hero section
  assert.ok(content.includes('Master Clinical Judgment'), 'Must contain Hero section headline');

  // 4 Feature cards
  assert.ok(content.includes('featureCards'), 'Must define feature cards');
  assert.ok(content.includes('All 7 NextGen (NGN) Item Formats'), 'Must describe NGN formats');
  assert.ok(content.includes('Exhaustive Clinical Rationales'), 'Must describe clinical rationales');
  assert.ok(content.includes('Adaptive CAT Testing Simulation'), 'Must describe CAT simulation');
  assert.ok(content.includes('Smart Readiness & Weak-Area Drills'), 'Must describe analytics');

  // How it works in 3 steps
  assert.ok(content.includes('How It Works in 3 Simple Steps'), 'Must contain 3-step section');
  assert.ok(content.includes('Configure Your Drill or Full Exam'), 'Step 1 title');
  assert.ok(content.includes('Apply the Clinical Judgment Model'), 'Step 2 title');
  assert.ok(content.includes('Remediate Weaknesses & Master Concepts'), 'Step 3 title');

  // Working sample question
  assert.ok(content.includes('<WorkingSampleQuestion'), 'Must embed working sample question component');

  // Free vs paid comparison
  assert.ok(content.includes('Free Candidate Demo vs. Full Q-Bank Access'), 'Must contain comparison table');
  assert.ok(content.includes('comparisonRows'), 'Must define comparison metrics');

  // FAQ
  assert.ok(content.includes('Frequently Asked Questions'), 'Must contain FAQ section');

  // Top and bottom Launch Q-Bank buttons referencing NEXT_PUBLIC_QBANK_APP_URL || '/app'
  assert.ok(content.includes('process.env.NEXT_PUBLIC_QBANK_APP_URL || \'/app\''), 'Must use NEXT_PUBLIC_QBANK_APP_URL with fallback to /app');
  
  // Count Launch Q-Bank occurrences
  const buttonMatches = content.match(/Launch Q-Bank/g) || [];
  assert.ok(buttonMatches.length >= 2, 'Must have at least 2 Launch Q-Bank buttons (top and bottom)');
});

test('Working Sample Question Component: Interactive with options, rationales, and clinical pearl', () => {
  const samplePath = path.join(ROOT_DIR, 'components/qbank/WorkingSampleQuestion.tsx');
  assert.ok(fs.existsSync(samplePath), 'WorkingSampleQuestion component must exist');

  const content = fs.readFileSync(samplePath, 'utf-8');
  assert.ok(content.startsWith("'use client'"), 'Must be interactive client component');
  assert.ok(content.includes('handleSubmit'), 'Must handle answer submission');
  assert.ok(content.includes('handleReset'), 'Must allow re-trying the question');
  assert.ok(content.includes('Option-by-Option Clinical Rationales'), 'Must render option explanations');
  assert.ok(content.includes('High-Yield Clinical Pearl'), 'Must include clinical pearl');
});

test('/app Layout: Server session check, redirect to /login?redirect=/app, and robots noindex', () => {
  const layoutPath = path.join(ROOT_DIR, 'app/(app)/app/layout.tsx');
  assert.ok(fs.existsSync(layoutPath), 'app/(app)/app/layout.tsx must exist');

  const content = fs.readFileSync(layoutPath, 'utf-8');
  
  // Server-rendered
  assert.ok(!content.startsWith("'use client'"), 'Layout must be server-rendered');

  // Session check via cookies & verifyToken
  assert.ok(content.includes("cookieStore.get('nclex_token')"), 'Must check candidate auth cookie');
  assert.ok(content.includes('verifyToken('), 'Must verify session token');

  // Redirect to /login?redirect=/app
  assert.ok(content.includes("redirect('/login?redirect=/app')"), 'Must redirect unauthenticated users to /login?redirect=/app');

  // Robots noindex
  assert.ok(content.includes('index: false'), 'Robots metadata must set index: false');
  assert.ok(content.includes('follow: false'), 'Robots metadata must set follow: false');
});

test('App Pages & Shell: Dashboard, create-test placeholder, sessions placeholder, and Back to website links', () => {
  const shellPath = path.join(ROOT_DIR, 'app/(app)/app/components/AppShell.tsx');
  assert.ok(fs.existsSync(shellPath), 'AppShell must exist');
  const shellContent = fs.readFileSync(shellPath, 'utf-8');
  assert.ok(shellContent.includes('Back to website'), 'AppShell must contain Back to website link');
  assert.ok(shellContent.includes('/app/create-test'), 'AppShell must link to create-test');
  assert.ok(shellContent.includes('/app/sessions'), 'AppShell must link to sessions');

  const dashboardPath = path.join(ROOT_DIR, 'app/(app)/app/page.tsx');
  assert.ok(fs.existsSync(dashboardPath), 'Dashboard page must exist');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
  assert.ok(dashboardContent.includes('Back to website'), 'Dashboard must contain Back to website link');

  const createTestPath = path.join(ROOT_DIR, 'app/(app)/app/create-test/page.tsx');
  assert.ok(fs.existsSync(createTestPath), 'Create test placeholder must exist');
  const createTestContent = fs.readFileSync(createTestPath, 'utf-8');
  assert.ok(createTestContent.includes('Back to website'), 'Create test page must contain Back to website link');

  const sessionsPath = path.join(ROOT_DIR, 'app/(app)/app/sessions/page.tsx');
  assert.ok(fs.existsSync(sessionsPath), 'Sessions placeholder must exist');
  const sessionsContent = fs.readFileSync(sessionsPath, 'utf-8');
  assert.ok(sessionsContent.includes('Website'), 'Sessions page must contain Website link');
});

test('Robots & Login Redirect Integrity', () => {
  const robotsContent = fs.readFileSync(path.join(ROOT_DIR, 'app/robots.ts'), 'utf-8');
  assert.ok(robotsContent.includes("'/app'"), 'robots.ts must disallow /app');
  assert.ok(robotsContent.includes("'/app/*'"), 'robots.ts must disallow /app/*');

  const loginContent = fs.readFileSync(path.join(ROOT_DIR, 'app/login/page.tsx'), 'utf-8');
  assert.ok(
    loginContent.includes("searchParams.get('redirect')"),
    'Login page must support redirect query param to return to /app'
  );
});
