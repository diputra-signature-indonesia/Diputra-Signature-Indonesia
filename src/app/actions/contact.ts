'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ContactState = {
  ok: boolean;
  error?: string;
  values?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    message?: string | null;
  };
};

export async function submitContact(prevState: ContactState, formData: FormData): Promise<ContactState> {
  const nameEntry = formData.get('name');
  const phoneEntry = formData.get('phone');
  const emailEntry = formData.get('email');
  const messageEntry = formData.get('message');

  const name = typeof nameEntry === 'string' ? nameEntry.trim() : null;
  const phone = typeof phoneEntry === 'string' ? phoneEntry.trim() : null;
  const email = typeof emailEntry === 'string' ? emailEntry.trim() : null;
  const message = typeof messageEntry === 'string' ? messageEntry.trim() : null;

  if (!name || !phone || !email || !message) {
    return { ok: false, error: 'All fields are required.', values: { name, phone, email, message } };
  }

  // SIMPAN KE DB (tidak butuh email tujuan)
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from('contact_messages').insert([
      {
        name,
        phone,
        email,
        message,
        status: 'new',
      },
    ]);

    if (error) throw error;

    return { ok: true };
  } catch (e) {
    console.error('submitContact error:', e);
    return { ok: false, error: 'Failed to send message. Please try again later.', values: { name, phone, email, message } };
  }
}
