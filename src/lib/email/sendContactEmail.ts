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
  // contoh: "Diputra Signature Indonesia <info@diputrasignature.com>"

  if (!to) return { skipped: true as const, reason: 'CONTACT_TO_EMAIL not set' };
  if (!from) return { skipped: true as const, reason: 'CONTACT_FROM_EMAIL not set' };

  const subject = `New Contact Message — ${payload.name}`;

  const text = [`New Contact Message`, ``, `Name: ${payload.name}`, `Email: ${payload.email}`, `Phone: ${payload.phone}`, ``, `Message:`, payload.message].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Contact Message</h2>
      <p><b>Name:</b> ${escapeHtml(payload.name)}</p>
      <p><b>Email:</b> ${escapeHtml(payload.email)}</p>
      <p><b>Phone:</b> ${escapeHtml(payload.phone)}</p>
      <p><b>Message:</b><br/>${escapeHtml(payload.message).replace(/\n/g, '<br/>')}</p>
    </div>
  `;

  const res = await resend.emails.send({
    from,
    to,
    subject,
    // Ini yang paling kompatibel di Resend:
    replyTo: payload.email,
    text,
    html,
  });

  return { skipped: false as const, res };
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
