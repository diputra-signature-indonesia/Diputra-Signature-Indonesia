'use client';

import IconWhatsapp from '@/icons/BrandIconWhatsapp';
import { Bell, Check, Clock3, Info, MessageCircleMore, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ANNOUNCEMENT_STORAGE_KEY = 'dsi-announcement:office-hours:v1';
const WHATSAPP_URL = 'https://wa.me/6287851021080?text=Hello%20Diputra%20Signature%20Indonesia%2C%20I%20would%20like%20to%20ask%20about%20your%20services.';

export function HomeFloatingContact() {
  const [expanded, setExpanded] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function closeAnnouncement() {
    window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, 'seen');
    setAnnouncementOpen(false);
  }

  useEffect(() => {
    if (window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setAnnouncementOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    function closeActions(event: PointerEvent) {
      if (!launcherRef.current?.contains(event.target as Node)) setExpanded(false);
    }
    document.addEventListener('pointerdown', closeActions);
    return () => document.removeEventListener('pointerdown', closeActions);
  }, [expanded]);

  useEffect(() => {
    if (!announcementOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAnnouncement();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [announcementOpen]);

  function openAnnouncement() {
    setExpanded(false);
    setAnnouncementOpen(true);
  }

  return (
    <>
      <div ref={launcherRef} className="fixed right-4 z-40 flex flex-col items-end gap-2.5 sm:right-6" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className={`flex flex-col items-end gap-2.5 transition-all duration-200 ${expanded ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`} aria-hidden={!expanded}>
          <button
            type="button"
            tabIndex={expanded ? 0 : -1}
            onClick={openAnnouncement}
            className="group flex h-11 items-center gap-3 rounded-full border border-black/8 bg-white px-3.5 pr-4 text-left text-sm font-semibold text-[#25201F] shadow-[0_8px_28px_rgba(38,25,25,0.13)] transition hover:-translate-y-0.5 hover:border-[#800020]/20 hover:text-[#800020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/30"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[#800020]/8 text-[#800020]"><Bell aria-hidden="true" className="size-4" /></span>
            Information
          </button>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={expanded ? 0 : -1}
            aria-label="Chat with Diputra Signature Indonesia on WhatsApp"
            className="group flex h-11 items-center gap-3 rounded-full border border-black/8 bg-white px-3.5 pr-4 text-left text-sm font-semibold text-[#25201F] shadow-[0_8px_28px_rgba(38,25,25,0.13)] transition hover:-translate-y-0.5 hover:border-[#167C45]/20 hover:text-[#167C45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167C45]/25"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[#EAF7EF] text-[#167C45]"><IconWhatsapp aria-hidden="true" className="size-4" /></span>
            WhatsApp
          </a>
        </div>

        <button
          type="button"
          aria-label={expanded ? 'Close contact options' : 'Open contact and information options'}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="group relative flex size-13 items-center justify-center rounded-full border border-white/70 bg-[#800020] text-white shadow-[0_10px_30px_rgba(86,0,23,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#68001A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5A600] focus-visible:ring-offset-2 sm:size-14"
        >
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#E6B800]" aria-hidden="true" />
          {expanded ? <X aria-hidden="true" className="size-5 transition-transform" /> : <MessageCircleMore aria-hidden="true" className="size-5 sm:size-6" />}
        </button>
      </div>

      {announcementOpen ? (
        <div className="fixed inset-0 z-70 flex items-end justify-center bg-[#1F1517]/45 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAnnouncement(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="announcement-title" aria-describedby="announcement-description" className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_24px_80px_rgba(38,17,23,0.25)]">
            <div className="relative overflow-hidden bg-[#800020] px-5 pt-5 pb-6 text-white sm:px-7 sm:pt-6">
              <div className="absolute -top-14 -right-10 size-36 rounded-full border border-white/10" aria-hidden="true" />
              <div className="absolute -top-5 -right-4 size-20 rounded-full bg-[#D5A600]/18" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase"><Info aria-hidden="true" className="size-3" />Important information</span>
                  <h2 id="announcement-title" className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">Office Hours &amp; Service Availability</h2>
                </div>
                <button ref={closeButtonRef} type="button" onClick={closeAnnouncement} aria-label="Close announcement" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><X aria-hidden="true" className="size-4" /></button>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#167C45]"><span className="flex size-5 items-center justify-center rounded-full bg-[#EAF7EF]"><Check aria-hidden="true" className="size-3" /></span>Operational as usual</div>
              <p id="announcement-description" className="mt-4 text-sm leading-6 text-[#51494A] sm:text-[15px]">
                Our team is available for legal, visa, and business consultations during the following operational hours.
              </p>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#800020]/10 bg-[#FBF8F8] p-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#800020] shadow-sm"><Clock3 aria-hidden="true" className="size-4" /></span>
                <div><p className="text-sm font-semibold text-[#292323]">Monday–Friday</p><p className="mt-1 text-xs leading-5 text-[#746B6C]">09:00–17:00 WITA · WhatsApp responses follow our operational hours.</p></div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-[#8A8182]">This is temporary announcement content and can be adjusted after review.</p>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeAnnouncement} className="h-10 rounded-lg border border-[#D8D1D2] px-5 text-sm font-semibold text-[#51494A] transition hover:bg-[#F7F4F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/20">Got it</button>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#800020] px-5 text-sm font-semibold text-white transition hover:bg-[#68001A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:ring-offset-2"><IconWhatsapp aria-hidden="true" className="size-4" />Chat on WhatsApp</a>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
