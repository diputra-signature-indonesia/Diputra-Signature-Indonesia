'use server';

import { sendContactEmail } from '@/lib/email/sendContactEmail';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ContactState = {
  ok: boolean;
  error?: string;
  values?: { name?: string | null; phone?: string | null; email?: string | null; message?: string | null };
};

export async function submitContact(prevState: ContactState, formData: FormData): Promise<ContactState> {
  const name = getStr(formData, 'name');
  const phone = getStr(formData, 'phone');
  const email = getStr(formData, 'email');
  const message = getStr(formData, 'message');

  if (!name || !phone || !email || !message) {
    return { ok: false, error: 'All fields are required.', values: { name, phone, email, message } };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // 1) simpan ke DB (backup + admin inbox)
    const { error: insertError } = await supabase.from('contact_messages').insert([{ name, phone, email, message, status: 'new' }]);
    if (insertError) throw insertError;

    // 2) coba kirim email (kalau gagal, tidak menggagalkan submit)
    try {
      await sendContactEmail({ name, phone, email, message });
    } catch (e) {
      console.error('sendContactEmail failed:', e);
      // tetap return ok: true karena data sudah tersimpan
    }

    return { ok: true };
  } catch (e) {
    console.error('submitContact failed:', e);
    return { ok: false, error: 'Failed to send message. Please try again later.', values: { name, phone, email, message } };
  }
}

function getStr(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : null;
}
