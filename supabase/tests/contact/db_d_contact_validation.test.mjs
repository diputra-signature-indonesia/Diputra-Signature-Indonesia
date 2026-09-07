import assert from 'node:assert/strict';
import test from 'node:test';

import { validateContactFormData } from '../../../src/lib/contact/validation.ts';
import { isAcceptedTurnstileResponse, isTurnstileTestModeAllowed, parseTurnstileHostnames, TURNSTILE_ACTION, TURNSTILE_ALWAYS_PASS_TEST_SECRET } from '../../../src/lib/security/turnstile-config.ts';

function makeContactForm(overrides = {}) {
  const formData = new FormData();
  const values = {
    name: '  Valid Name  ',
    email: '  PERSON@Example.Test ',
    phone: ' +62 812-3456-7890 ',
    message: '  A valid contact message.  ',
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

test('contact validation trims and normalizes valid input', () => {
  const result = validateContactFormData(makeContactForm());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.data, {
    name: 'Valid Name',
    email: 'person@example.test',
    phone: '+62 812-3456-7890',
    message: 'A valid contact message.',
  });
});

test('contact validation rejects invalid name, email, phone, and message', async (t) => {
  const cases = [
    ['name', { name: 'A' }],
    ['email', { email: 'not-an-email' }],
    ['phone', { phone: 'call-me' }],
    ['message', { message: 'short' }],
  ];

  for (const [label, overrides] of cases) {
    await t.test(label, () => {
      assert.equal(validateContactFormData(makeContactForm(overrides)).ok, false);
    });
  }
});

test('contact validation rejects control characters outside message newlines', () => {
  assert.equal(validateContactFormData(makeContactForm({ name: 'Bad\nName' })).ok, false);
  assert.equal(validateContactFormData(makeContactForm({ phone: '+62\t81234567' })).ok, false);
  assert.equal(validateContactFormData(makeContactForm({ message: 'Valid line one\nValid line two' })).ok, true);
  assert.equal(validateContactFormData(makeContactForm({ message: 'Invalid\tmessage content' })).ok, false);
});

test('contact validation caps reflected invalid values', () => {
  const result = validateContactFormData(makeContactForm({ message: 'x'.repeat(6000) }));

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.values.message?.length, 5000);
});

test('Turnstile response requires success, action, and allowed hostname', () => {
  const allowedHostnames = parseTurnstileHostnames('example.com, www.example.com');

  assert.equal(
    isAcceptedTurnstileResponse(
      {
        success: true,
        action: TURNSTILE_ACTION,
        hostname: 'Example.COM',
      },
      allowedHostnames
    ),
    true
  );

  assert.equal(isAcceptedTurnstileResponse({ success: false, action: TURNSTILE_ACTION, hostname: 'example.com' }, allowedHostnames), false);
  assert.equal(isAcceptedTurnstileResponse({ success: true, action: 'other_action', hostname: 'example.com' }, allowedHostnames), false);
  assert.equal(isAcceptedTurnstileResponse({ success: true, action: TURNSTILE_ACTION, hostname: 'evil.example' }, allowedHostnames), false);
  assert.equal(isAcceptedTurnstileResponse({ success: true, action: TURNSTILE_ACTION, hostname: 'example.com' }, new Set()), false);
});

test('Turnstile dummy test mode cannot be enabled in Production', () => {
  const base = {
    enabled: true,
    secretKey: TURNSTILE_ALWAYS_PASS_TEST_SECRET,
  };

  assert.equal(isTurnstileTestModeAllowed({ ...base, nodeEnv: 'development', vercelEnv: undefined }), true);
  assert.equal(isTurnstileTestModeAllowed({ ...base, nodeEnv: 'production', vercelEnv: 'preview' }), true);
  assert.equal(isTurnstileTestModeAllowed({ ...base, nodeEnv: 'production', vercelEnv: 'production' }), false);
  assert.equal(isTurnstileTestModeAllowed({ ...base, nodeEnv: 'development', vercelEnv: 'production' }), false);
  assert.equal(isTurnstileTestModeAllowed({ ...base, nodeEnv: 'production', vercelEnv: undefined }), false);
  assert.equal(isTurnstileTestModeAllowed({ ...base, secretKey: 'a-real-secret', nodeEnv: 'development', vercelEnv: undefined }), false);
});
