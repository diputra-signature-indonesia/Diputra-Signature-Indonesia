'use server';

export type ContactState = {
  ok: boolean;
  error?: string;
  // NANTI (optional):
  // fieldErrors?: {
  //   name?: string;
  //   email?: string;
  //   message?: string;
  // };
  values?: {
    name?: string | null;
    email?: string | null;
    message?: string | null;
  };
};

export async function submitContact(prevState: ContactState, formData: FormData): Promise<ContactState> {
  const typeEntry = formData.get('type');
  const nameEntry = formData.get('name');
  const emailEntry = formData.get('email');
  const messageEntry = formData.get('message');

  const type = typeof typeEntry === 'string' ? typeEntry : null;
  const name = typeof nameEntry === 'string' ? nameEntry : null;
  const email = typeof emailEntry === 'string' ? emailEntry : null;
  const message = typeof messageEntry === 'string' ? messageEntry : null;

  console.log('Received Contact:', { type, name, email, message });

  // -----------------------------------------------------
  // BASIC VALIDATION
  // -----------------------------------------------------
  if (!name || !email || !message) {
    return {
      ok: false,
      error: 'All fields are required.',
      values: {
        name,
        email,
        message,
      },
    };
  }

  // -----------------------------------------------------
  // NANTI: contoh validasi lanjutan (opsional)
  // -----------------------------------------------------
  // if (name.length < 2) {
  //   return {
  //     ok: false,
  //     fieldErrors: { name: "Name must be at least 2 characters." },
  //     values: { name, email, message },
  //   };
  // }
  //
  // if (!email.includes("@")) {
  //   return {
  //     ok: false,
  //     fieldErrors: { email: "Invalid email format." },
  //     values: { name, email, message },
  //   };
  // }

  // -----------------------------------------------------
  // PLACEHOLDER: email/send-to-database logic
  // -----------------------------------------------------
  // TODO: send email or save the message to database
  // await sendEmailToAdmin({ type, name, email, message });
  // await saveContactToDb(...);

  // TODO: kirim email/simpan data
  return { ok: true };
}
