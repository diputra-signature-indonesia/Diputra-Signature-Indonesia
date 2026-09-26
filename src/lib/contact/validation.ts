export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { min: 7, max: 32 },
  message: { min: 10, max: 5000 },
} as const;

export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type ContactFormValues = Partial<Record<keyof ContactInput, string>>;

type ContactValidationResult = { ok: true; data: ContactInput } | { ok: false; error: string; values: ContactFormValues };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+(). -]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const MESSAGE_CONTROL_CHARACTER_PATTERN = /[\u0000-\u0009\u000b-\u001f\u007f]/;

function readText(formData: FormData, key: keyof ContactInput, scanLimit: number) {
  const value = formData.get(key);
  if (typeof value !== 'string') return '';

  return value.slice(0, scanLimit + 1);
}

export function validateContactFormData(formData: FormData): ContactValidationResult {
  const name = readText(formData, 'name', CONTACT_LIMITS.name.max).trim();
  const email = readText(formData, 'email', CONTACT_LIMITS.email.max).trim().toLowerCase();
  const phone = readText(formData, 'phone', CONTACT_LIMITS.phone.max).trim();
  const message = readText(formData, 'message', CONTACT_LIMITS.message.max).replace(/\r\n?/g, '\n').trim();

  const values: ContactFormValues = {
    name: name.slice(0, CONTACT_LIMITS.name.max),
    email: email.slice(0, CONTACT_LIMITS.email.max),
    phone: phone.slice(0, CONTACT_LIMITS.phone.max),
    message: message.slice(0, CONTACT_LIMITS.message.max),
  };

  if (name.length < CONTACT_LIMITS.name.min || name.length > CONTACT_LIMITS.name.max || CONTROL_CHARACTER_PATTERN.test(name)) {
    return { ok: false, error: 'Name must contain between 2 and 100 valid characters.', values };
  }

  if (!email || email.length > CONTACT_LIMITS.email.max || CONTROL_CHARACTER_PATTERN.test(email) || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.', values };
  }

  if (phone.length < CONTACT_LIMITS.phone.min || phone.length > CONTACT_LIMITS.phone.max || CONTROL_CHARACTER_PATTERN.test(phone) || !PHONE_PATTERN.test(phone)) {
    return { ok: false, error: 'Please enter a valid phone number.', values };
  }

  if (message.length < CONTACT_LIMITS.message.min || message.length > CONTACT_LIMITS.message.max || MESSAGE_CONTROL_CHARACTER_PATTERN.test(message)) {
    return { ok: false, error: 'Message must contain between 10 and 5000 valid characters.', values };
  }

  return { ok: true, data: { name, email, phone, message } };
}
