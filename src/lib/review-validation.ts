export const REVIEW_INPUT_LIMITS = {
  token: 64,
  name: 100,
  email: 254,
  message: 2000,
} as const;

export type ReviewInput = {
  token: string;
  name: string;
  email: string;
  message: string;
};

export type NormalizedReviewInput = ReviewInput;

type ReviewValidationResult = { ok: true; data: NormalizedReviewInput } | { ok: false; message: string };

const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateReviewInput(input: ReviewInput): ReviewValidationResult {
  const token = typeof input.token === 'string' ? input.token.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';

  if (token.length !== REVIEW_INPUT_LIMITS.token || !TOKEN_PATTERN.test(token)) {
    return { ok: false, message: 'This review link is invalid.' };
  }

  if (!name) {
    return { ok: false, message: 'Name is required.' };
  }

  if (name.length > REVIEW_INPUT_LIMITS.name) {
    return { ok: false, message: `Name must be ${REVIEW_INPUT_LIMITS.name} characters or fewer.` };
  }

  if (email && (email.length > REVIEW_INPUT_LIMITS.email || !EMAIL_PATTERN.test(email))) {
    return { ok: false, message: 'Enter a valid email address.' };
  }

  if (!message) {
    return { ok: false, message: 'Review message is required.' };
  }

  if (message.length > REVIEW_INPUT_LIMITS.message) {
    return { ok: false, message: `Review message must be ${REVIEW_INPUT_LIMITS.message.toLocaleString('en-US')} characters or fewer.` };
  }

  return {
    ok: true,
    data: { token, name, email, message },
  };
}
