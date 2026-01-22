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
  const from = process.env.CONTACT_FROM_EMAIL || 'no-reply@diputrasignature.com';

  // kalau belum set, skip kirim email (tetap aman)
  if (!to) return { skipped: true as const };

  // NOTE: agar deliverability bagus, "from" harus domain yang sudah diverifikasi di provider
  // kalau belum, sementara bisa pakai from default dari Resend (mis: onboarding@resend.dev)
  const subject = `New Contact Message — ${payload.name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Contact Message</h2>
      <p><b>Name:</b> ${escapeHtml(payload.name)}</p>
      <p><b>Email:</b> ${escapeHtml(payload.email)}</p>
      <p><b>Phone:</b> ${escapeHtml(payload.phone)}</p>
      <p><b>Message:</b><br/>${escapeHtml(payload.message).replace(/\n/g, '<br/>')}</p>
    </div>
  `;

  await resend.emails.send({
    from,
    to,
    subject,
    replyTo: payload.email, // biar admin tinggal reply ke pengirim
    html,
  });

  return { skipped: false as const };
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
