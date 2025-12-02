'use client';

import { useState, useActionState } from 'react';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import { submitContact, type ContactState } from '@/app/actions/contact';

const initialState: ContactState = { ok: false };

export function ContactForm() {
  const [contact, setContact] = useState<'message' | 'review'>('message');
  const [state, formAction, isPending] = useActionState(submitContact, initialState);

  return (
    <>
      <div className="flex w-full flex-col gap-7">
        <div className="flex flex-col gap-5">
          <h3 className="brand-h2 text-brand-maroon font-semibold">Message</h3>
          <div className="border-brand-burgundy flex overflow-hidden rounded-lg border *:rounded-none sm:rounded-xl sm:*:rounded-none">
            <BrandButton onClick={() => setContact('message')} variant={contact === 'message' ? `red` : `white`} className="w-1/2 justify-center border-0">
              Send Message
            </BrandButton>
            <BrandButton onClick={() => setContact('review')} variant={contact === 'review' ? `red` : `white`} className="w-1/2 justify-center border-0">
              Send Review
            </BrandButton>
          </div>
        </div>
        <form action={formAction} className="flex flex-col gap-3 sm:gap-4">
          <input type="hidden" name="type" value={contact} />
          <input type="text" name="name" defaultValue={state.values?.name ?? ''} placeholder="Name" className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base" />
          <input
            type="text"
            name="email"
            defaultValue={state.values?.email ?? ''}
            placeholder="Email address"
            className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
          />
          <input
            type="text"
            name="message"
            defaultValue={state.values?.message ?? ''}
            placeholder="Message"
            className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
          />
          <div className="mt-7 flex flex-col items-end gap-4">
            <p className="brand-p">Kami akan segera menghubungi Anda untuk memberikan penjelasan dan pendampingan terkait kebutuhan legal dan imigrasi Anda.</p>
            <div className="flex w-full justify-between">
              {state.ok && <p className="brand-p my-auto text-green-600">Message sent!</p>}
              {state.error && <p className="brand-p my-auto text-red-600">{state.error}</p>}
              <SubmitButton pending={isPending} />
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <BrandButton type="submit" disabled={pending} variant="white" className="w-fit transition-all">
      Submit
      {pending ? (
        <span className="border-brand-black size-3 animate-spin rounded-full border-x-2 border-t-2"></span>
      ) : (
        <span>
          <IconArrow className="size-5" />
        </span>
      )}
    </BrandButton>
  );
}
