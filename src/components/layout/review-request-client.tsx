'use client';

import { submitReviewAction } from '@/app/review-request/[token]/actions';
import { useState } from 'react';
import { BrandButton } from '../ui/button';

type Props = {
  token: string;
  status: 'valid' | 'expired' | 'used' | 'invalid';
};

export default function ReviewRequestClient({ token, status }: Props) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // contoh: link google review (nanti ganti punya DSI)
  const googleReviewUrl = 'https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID';

  if (done) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Thank you!</h1>
        <p className="text-sm text-black/80">
          <ReviewResult review={message} />
        </p>

        <a href={googleReviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
          Leave a Google Review
        </a>
      </div>
    );
  }

  if (status !== 'valid') {
    const title = status === 'used' ? 'Link already used' : status === 'expired' ? 'Link expired' : 'Invalid link';

    const desc =
      status === 'used'
        ? 'Link review ini sudah digunakan. Jika kamu perlu link baru, silakan hubungi tim DSI.'
        : status === 'expired'
          ? 'Link review ini sudah kedaluwarsa. Silakan minta link baru ke tim DSI.'
          : 'Link review ini tidak valid. Pastikan kamu membuka link yang benar dari tim DSI.';

    return (
      <div className="space-y-2">
        <h1 className="text-brand-black text-xl font-semibold">{title}</h1>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return alert('Review message is required');

    setIsSubmitting(true);
    try {
      await submitReviewAction({
        token,
        name,
        email,
        message,
      });
      setDone(true);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-brand-burgundy text-xl font-semibold">Leave a Review</h1>
        <p className="text-brand-black mt-5 text-sm">Thank you for using Diputra Signature Indonesia services. Your review helps us continuously improve the quality of our service.</p>
      </div>

      <div className="space-y-2">
        <label className="text-brand-black text-sm">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John"
          className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
        />
      </div>
      <div className="space-y-2">
        <label className="text-brand-black text-sm">Email (optional and will not be displayed publicly)</label>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your-email@example.com"
          className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
        />
      </div>

      <div className="space-y-2">
        <label className="text-brand-black text-sm">Your review</label>
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your experience..."
          rows={5}
          className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
        />
      </div>

      <BrandButton type="submit" disabled={isSubmitting} variant="white" className="w-full justify-center transition-all">
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </BrandButton>
    </form>
  );
}

function ReviewResult({ review }: { review: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(review);
    setCopied(true);

    // reset icon setelah beberapa detik (opsional)
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm">
      <p className="mb-2 font-semibold text-green-800">Copy Review</p>

      <div className="flex items-start gap-3">
        <p className="font-mono break-all text-green-900">{review}</p>

        <button type="button" onClick={handleCopy} className="shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition hover:bg-green-100 disabled:opacity-60" disabled={copied}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
