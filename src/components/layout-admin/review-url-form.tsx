'use client';

import { createReviewRequestAction } from '@/app/admin/reviews/create/actions';
import Link from 'next/link';
import { useState, useTransition } from 'react';

export default function CreateUrlForm() {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="font-raleway flex h-full w-full flex-col px-4 py-6"
      action={(formData) => {
        startTransition(async () => {
          const res = await createReviewRequestAction(formData);
          setResultUrl(res.url);
        });
      }}
    >
      <div className="flex flex-row justify-between">
        <h1>New Generate URL</h1>
        <div className="flex flex-row gap-3">
          <Link href="/admin/reviews" className="rounded-md bg-gray-500 px-7 py-2 text-white">
            Cancel
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-7 flex w-4xl flex-col gap-7 pb-52">
        <div className="flex flex-col rounded-sm border border-gray-300">
          <h2 className="bg-gray-200 px-5 py-4 font-semibold">Client Name</h2>
          <input name="clientName" type="text" required className="px-5 py-4" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>

        <div className="flex flex-col rounded-sm border border-gray-300">
          <h2 className="bg-gray-200 px-5 py-4 font-semibold">Client Email</h2>
          <input name="clientEmail" type="email" className="px-5 py-4" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
        </div>

        <button type="submit" disabled={isPending} className="self-start rounded-md bg-black px-6 py-2 text-white">
          {isPending ? 'Generating...' : 'Generate Review URL'}
        </button>

        {resultUrl && <GeneratedUrlResult url={resultUrl} />}
      </div>
    </form>
  );
}

function GeneratedUrlResult({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  async function handleCopy() {
    await navigator.clipboard.writeText(BASE_URL + url);
    setCopied(true);

    // reset icon setelah beberapa detik (opsional)
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm">
      <p className="mb-2 font-semibold text-green-800">Review URL generated (copy now — shown once)</p>

      <div className="flex items-start gap-3">
        <p className="font-mono break-all text-green-900">
          {BASE_URL}
          {url}
        </p>

        <button type="button" onClick={handleCopy} className="shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition hover:bg-green-100 disabled:opacity-60" disabled={copied}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
