'use client';

import { submitContact, type ContactState } from '@/app/actions/contact';
import IconArrow from '@/icons/BrandIconArrow';
import { useActionState } from 'react';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

const initialState: ContactState = { ok: false };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContact, initialState);

  const hasError = Boolean(state.error);

  return (
    <>
      <div className="flex w-full flex-col gap-7 px-5 sm:px-10 md:px-0">
        <div className="flex flex-col gap-5">
          <Motion
            as="div"
            delay={0.3}
            duration={0.6}
            y={0}
            x={24}
            once={true}
            className="border-brand-burgundy bg-brand-burgundy flex overflow-hidden rounded-lg border *:rounded-none sm:rounded-xl sm:*:rounded-none"
          >
            <p className="w-full justify-center border-0 px-3 py-3 text-center text-white">Send Message</p>
          </Motion>
        </div>
        <Motion as="div" delay={0.4} duration={0.6} y={0} x={24} once={true}>
          <form action={formAction} className="flex flex-col gap-3 sm:gap-4">
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

            <input
              type="tel"
              name="phone"
              defaultValue={state.values?.phone ?? ''}
              placeholder="Phone number"
              aria-invalid={hasError}
              aria-describedby={hasError ? 'contact-form-error' : undefined}
              className="w-full rounded-xl border border-gray-300 px-5 py-2 text-xs sm:text-sm lg:text-base"
            />

            {/* 
            // NANTI: error khusus untuk email (jika ada)
            // {state.fieldErrors?.phone && (
            //   <p id="contact-phone-error" className="brand-p mt-1 text-red-600">
            //     {state.fieldErrors.phone}
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
              <p className="brand-p">We will get back to you as soon as possible with clear guidance and support for your legal, visa, or business needs in Bali</p>
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
        </Motion>
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
