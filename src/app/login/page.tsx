import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

const ERROR_TEXT: Record<string, string> = {
  not_whitelisted: 'Akun ini belum diberi akses admin. Hubungi administrator.',
  inactive: 'Akun ini dinonaktifkan. Hubungi administrator.',
  forbidden: 'Akun ini tidak memiliki izin untuk mengakses admin.',
  domain_not_allowed: 'Domain email tidak diizinkan.',
  missing_code: 'Login gagal. Silakan coba lagi.',
  oauth_callback_failed: 'Login gagal. Silakan coba lagi.',
};

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const errorKey = searchParams?.error ?? '';
  const errorMsg = ERROR_TEXT[errorKey];
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin Login</h1>
        <p className="mt-2 text-sm text-neutral-600">Sign in using your authorized Google account to access the admin dashboard.</p>
        {errorMsg ? <div className="mt-4 rounded-xl border px-4 py-3 text-sm">{errorMsg}</div> : null}
        <div className="mt-6">
          <GoogleLoginButton />
        </div>
        <p className="mt-6 text-xs text-neutral-500">If you don’t have access, please contact the administrator.</p>
      </div>
    </main>
  );
}
