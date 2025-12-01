"use client";

import { useState, useActionState } from "react";
import { BrandButton } from "../ui/button";
import IconArrow from "@/icons/BrandIconArrow"
import { submitContact, type ContactState } from "@/app/actions/contact";

const initialState: ContactState = { ok: false };

export function ContactForm() {
    const [contact, setContact] = useState<"message" | "review">("message");
    const [state, formAction, isPending] = useActionState(submitContact, initialState);

    return (
        <>
            <div className="flex flex-col gap-7 w-full">
                <div className="flex flex-col gap-5">
                    <h3 className="brand-h2 font-semibold text-brand-maroon">Message</h3>
                    <div className="flex rounded-lg sm:rounded-xl border border-brand-burgundy overflow-hidden *:rounded-none sm:*:rounded-none">
                        <BrandButton onClick={() => setContact("message")} variant={contact === "message" ? `red` : `white`} className="w-1/2 border-0 justify-center ">Send Message</BrandButton>
                        <BrandButton onClick={() => setContact("review")} variant={contact === "review" ? `red` : `white`} className="w-1/2 border-0 justify-center">Send Review</BrandButton>
                    </div>
                </div>
                <form action={formAction} className="flex flex-col gap-3 sm:gap-4">
                    <input type="hidden" name="type" value={contact}/>
                    <input type="text" name="name" defaultValue={state.values?.name ?? ""} placeholder="Name" className="w-full px-5 py-2 text-xs sm:text-sm lg:text-base rounded-xl border border-gray-300"/>
                    <input type="text" name="email" defaultValue={state.values?.email ?? ""} placeholder="Email address" className="w-full px-5 py-2 text-xs sm:text-sm lg:text-base rounded-xl border border-gray-300"/>
                    <input type="text" name="message" defaultValue={state.values?.message ?? ""} placeholder="Message" className="w-full px-5 py-2 text-xs sm:text-sm lg:text-base rounded-xl border border-gray-300"/>
                    <div className="flex flex-col mt-7 gap-4 items-end">
                        <p className="brand-p">Kami akan segera menghubungi Anda untuk memberikan penjelasan dan pendampingan terkait kebutuhan legal dan imigrasi Anda.</p>
                        <div className="w-full flex justify-between">
                            {state.ok && <p className="text-green-600 brand-p my-auto">Message sent!</p>}
                            {state.error && <p className="text-red-600 brand-p my-auto">{state.error}</p>}
                            <SubmitButton pending={isPending}  />
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
        {pending ? 
            <span className="size-3 rounded-full border-x-2 border-t-2 border-brand-black animate-spin"></span>
            : 
            <span><IconArrow className="size-5"/></span> 
        } 
        
        
    </BrandButton>
  );
}
