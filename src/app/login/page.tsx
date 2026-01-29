import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import Image from 'next/image';

const ERROR_TEXT: Record<string, string> = {
  not_whitelisted: 'Akun ini belum diberi akses admin. Hubungi administrator.',
  inactive: 'Akun ini dinonaktifkan. Hubungi administrator.',
  forbidden: 'Akun ini tidak memiliki izin untuk mengakses admin.',
  domain_not_allowed: 'Domain email tidak diizinkan.',
  missing_code: 'Login gagal. Silakan coba lagi.',
  oauth_callback_failed: 'Login gagal. Silakan coba lagi.',
};

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> | { error?: string } }) {
  const sp = searchParams ? await searchParams : undefined;
  const errorKey = sp?.error ?? '';
  const errorMsg = ERROR_TEXT[errorKey];
  return (
    <main className="font-raleway flex min-h-dvh items-center justify-center px-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 py-8 shadow-sm">
        <Image alt="diputra-signature-indonesia" src="/icon/dsi-logo.png" width={100} height={50} sizes="(max-width: 768px) 200px" className="mb-10 h-auto w-full object-contain px-4" />
        <h1 className="mx-8 text-2xl font-semibold">Login</h1>
        <p className="mx-8 mt-2 text-sm text-neutral-600">Sign in using your authorized Google account to access the admin dashboard.</p>
        {errorMsg ? <div className="mt-4 rounded-xl border px-4 py-3 text-sm">{errorMsg}</div> : null}
        <div className="mx-8 mt-6">
          <GoogleLoginButton />
        </div>
        <p className="mx-8 mt-6 text-xs text-neutral-500">If you don’t have access, please contact the administrator.</p>
        <div className="absolute top-0 -z-20 size-full bg-white" />
        <div className="bg-brand-yellow/5 absolute -bottom-24 -left-24 -z-10 size-64 rounded-full" />
        <div className="bg-brand-yellow/5 absolute top-24 -right-24 -z-10 size-64 rounded-full" />
      </div>
    </main>
  );
}
