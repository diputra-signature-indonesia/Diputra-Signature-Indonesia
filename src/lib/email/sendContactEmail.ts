import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type Payload = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export async function sendContactEmail(payload: Payload) {
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!to) return { skipped: true as const, reason: 'CONTACT_TO_EMAIL not set' };
  if (!from) return { skipped: true as const, reason: 'CONTACT_FROM_EMAIL not set' };

  const safeName = payload.name.replace(/[\r\n]+/g, ' ').trim();
  const safeEmail = payload.email.replace(/[\r\n]+/g, '').trim();
  const safePhone = payload.phone.replace(/[\r\n]+/g, ' ').trim();

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail);
  if (!isEmail) return { skipped: true as const, reason: 'Invalid email' };

  const subject = `New Contact Message — ${safeName}`;

  const text = [`New Contact Message`, ``, `Name: ${safeName}`, `Email: ${safeEmail}`, `Phone: ${safePhone}`, ``, `Message:`, payload.message].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Contact Message</h2>
      <p><b>Name:</b> ${escapeHtml(safeName)}</p>
      <p><b>Email:</b> ${escapeHtml(safeEmail)}</p>
      <p><b>Phone:</b> ${escapeHtml(safePhone)}</p>
      <p><b>Message:</b><br/>${escapeHtml(payload.message).replace(/\n/g, '<br/>')}</p>
    </div>
  `;

  try {
    const res = await resend.emails.send({
      from,
      to: [to],
      subject,
      replyTo: `${safeName} <${safeEmail}>`,
      text,
      html,
    });

    return { skipped: false as const, res };
  } catch (err: any) {
    return { skipped: false as const, error: true as const, message: err?.message ?? 'Resend send failed', err };
  }
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
