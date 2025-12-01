"use server";

export type ContactState = {
  ok: boolean;
  error?: string;
  values?: {
    name?: string | null;
    email?: string | null;
    message?: string | null;
  };
};

export async function submitContact(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const typeEntry = formData.get("type");
  const nameEntry = formData.get("name");
  const emailEntry = formData.get("email");
  const messageEntry = formData.get("message");

  const type = typeof typeEntry === "string" ? typeEntry : null;
  const name = typeof nameEntry === "string" ? nameEntry : null;
  const email = typeof emailEntry === "string" ? emailEntry : null;
  const message = typeof messageEntry === "string" ? messageEntry : null;

  console.log("Received Contact:", { type, name, email, message });

  // Validasi server-side
  if (!name || !email || !message) {
    return {
      ok: false,
      error: "Semua field wajib diisi.",
      values: {
        name,
        email,
        message,
      },
    };
  }

  // TODO: kirim email/simpan data
  return { ok: true };
}
