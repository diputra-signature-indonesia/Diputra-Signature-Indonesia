'use client';

import { useState, useActionState } from 'react';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import { submitContact, type ContactState } from '@/app/actions/contact';

const initialState: ContactState = { ok: false };

export function ContactForm() {
  const [contact, setContact] = useState<'message' | 'review'>('message');
  const [state, formAction, isPending] = useActionState(submitContact, initialState);

  const hasError = Boolean(state.error);

  return (
    <>
      <div className="flex w-full flex-col gap-7 px-5 sm:px-10 md:px-0">
        <div className="flex flex-col gap-5">
          <h3 className="brand-h2 text-brand-maroon border-brand-yellow border-l-4 pl-5 font-semibold">Message</h3>
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
          <input
            type="text"
            name="name"
            defaultValue={state.values?.name ?? ''}
            placeholder="Name"
            aria-invalid={hasError}
            aria-describedby={hasError ? 'contact-form-error' : undefined}
            className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
          />
          {/* 
            // NANTI: kalau punya error khusus untuk name, bisa seperti ini:
            // {state.fieldErrors?.name && (
            //   <p id="contact-name-error" className="brand-p mt-1 text-red-600">
            //     {state.fieldErrors.name}
            //   </p>
            // )}
          */}
          <input
            type="email"
            name="email"
            defaultValue={state.values?.email ?? ''}
            placeholder="Email address"
            aria-invalid={hasError}
            aria-describedby={hasError ? 'contact-form-error' : undefined}
            className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
          />

          {/* 
            // NANTI: error khusus untuk email (jika ada)
            // {state.fieldErrors?.email && (
            //   <p id="contact-email-error" className="brand-p mt-1 text-red-600">
            //     {state.fieldErrors.email}
            //   </p>
            // )}
          */}

          <textarea
            name="message"
            defaultValue={state.values?.message ?? ''}
            placeholder="Message"
            aria-invalid={hasError}
            aria-describedby={hasError ? 'contact-form-error' : undefined}
            rows={4}
            className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
          />

          {/* 
            // NANTI: error khusus untuk message
            // {state.fieldErrors?.message && (
            //   <p id="contact-message-error" className="brand-p mt-1 text-red-600">
            //     {state.fieldErrors.message}
            //   </p>
            // )}
          */}

          <div className="mt-7 flex flex-col items-end gap-4">
            <p className="brand-p">
              {contact === 'message'
                ? 'We will get back to you as soon as possible with clear guidance and support for your legal, visa, or business needs in Bali.'
                : 'Share your experience with Diputra Signature Indonesia. Your feedback helps us improve and support more clients in Bali.'}
            </p>
            <div className="flex w-full justify-between">
              {state.ok && <p className="brand-p my-auto text-green-600">Message sent successfully.</p>}
              {state.error && (
                <p id="contact-form-error" className="brand-p my-auto text-red-600">
                  {state.error}
                </p>
              )}
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
