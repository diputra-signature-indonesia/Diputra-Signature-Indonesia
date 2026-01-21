'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function GoogleLoginButton() {
  const onLogin = async () => {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button type="button" onClick={onLogin} className="w-full rounded-xl border px-4 py-3 text-sm font-medium transition hover:bg-neutral-50 active:scale-[0.99]">
      Sign in with Google
    </button>
  );
}
