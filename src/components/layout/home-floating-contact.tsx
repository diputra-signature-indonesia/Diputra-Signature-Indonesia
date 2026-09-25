'use client';

import IconWhatsapp from '@/icons/BrandIconWhatsapp';
import { Bell, Check, Clock3, Info, MessageCircleMore, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ANNOUNCEMENT_STORAGE_KEY = 'dsi-announcement:last-shown-date:v1';
const WHATSAPP_URL = 'https://wa.me/6287851021080?text=Hello%20Diputra%20Signature%20Indonesia%2C%20I%20would%20like%20to%20ask%20about%20your%20services.';

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function rememberAnnouncementForToday() {
  try {
    window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, getLocalDateKey());
  } catch {
    // The announcement remains usable when browser storage is unavailable.
  }
}

export function HomeFloatingContact() {
  const [expanded, setExpanded] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function closeAnnouncement() {
    rememberAnnouncementForToday();
    setAnnouncementOpen(false);
  }

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === getLocalDateKey()) return;
    } catch {
      // Continue without persistence when browser storage is unavailable.
    }

    const timer = window.setTimeout(() => {
      rememberAnnouncementForToday();
      setAnnouncementOpen(true);
    }, 900);

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
    rememberAnnouncementForToday();
    setAnnouncementOpen(true);
  }

  return (
    <>
      <div ref={launcherRef} className="fixed right-4 z-60 flex flex-col items-end gap-2.5 sm:right-6" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div
          className={`flex flex-col items-end gap-2.5 transition-all duration-200 ${expanded ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
          aria-hidden={!expanded}
        >
          <button
            type="button"
            tabIndex={expanded ? 0 : -1}
            onClick={openAnnouncement}
            className="group flex h-11 items-center gap-3 rounded-full border border-black/10 bg-white px-3.5 pr-4 text-left shadow-[0_10px_30px_rgba(24,18,19,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#800020]/25 hover:shadow-[0_14px_34px_rgba(24,18,19,0.22)] focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:outline-none active:scale-[0.98]"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[#800020]/10 text-[#800020] transition-transform duration-200 group-hover:scale-105">
              <Bell aria-hidden="true" className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-[#292323]">Information</span>
          </button>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={expanded ? 0 : -1}
            aria-label="Chat with Diputra Signature Indonesia on WhatsApp"
            className="group flex h-11 items-center gap-3 rounded-full border border-black/10 bg-white px-3.5 pr-4 text-left shadow-[0_10px_30px_rgba(24,18,19,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#167C45]/25 hover:shadow-[0_14px_34px_rgba(24,18,19,0.22)] focus-visible:ring-2 focus-visible:ring-[#167C45]/25 focus-visible:outline-none active:scale-[0.98]"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[#EAF7EF] text-[#167C45] transition-transform duration-200 group-hover:scale-105">
              <IconWhatsapp aria-hidden="true" className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-[#292323]">WhatsApp</span>
          </a>
        </div>

        <button
          type="button"
          aria-label={expanded ? 'Close contact options' : 'Open contact and information options'}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          style={{ backdropFilter: 'blur(8px) saturate(160%)', WebkitBackdropFilter: 'blur(8px) saturate(160%)' }}
          className={`group relative flex size-13 items-center justify-center rounded-full border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:outline-none active:scale-95 sm:size-14 ${
            expanded
              ? 'border-white/90 bg-white/65 text-[#1A1A1E] shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.95),inset_0_-1px_1px_0_rgba(0,0,0,0.05),0_10px_30px_-4px_rgba(0,0,0,0.15)]'
              : 'border-white/60 bg-white/35 text-[#1A1A1E] shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.85),inset_0_-1px_1px_0_rgba(0,0,0,0.03),0_8px_24px_-4px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/55 hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,1),0_12px_32px_-4px_rgba(0,0,0,0.15)]'
          }`}
        >
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
            <span className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/15 to-transparent opacity-70" />
          </span>

          <span
            className={`absolute top-0.5 right-0.5 z-20 flex size-3 items-center justify-center transition-opacity duration-200 ${expanded ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
            aria-hidden="true"
          >
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#E5A93C] opacity-40" />
            <span className="relative inline-flex size-2.5 rounded-full border border-white/90 bg-[#E5A93C] shadow-sm" />
          </span>

          <span className="relative z-10 flex items-center justify-center transition-transform duration-200">
            {expanded ? <X aria-hidden="true" className="size-5 transition-transform duration-200 group-hover:rotate-90" /> : <MessageCircleMore aria-hidden="true" className="size-5 sm:size-6" />}
          </span>
        </button>
      </div>

      {announcementOpen ? (
        <div
          className="fixed inset-0 z-70 flex items-end justify-center bg-black/40 px-4 py-4 backdrop-blur-[1px] sm:items-center sm:px-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAnnouncement();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            aria-describedby="announcement-description"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/15 shadow-[0_25px_70px_-12px_rgba(0,0,0,0.45)]"
          >
            <div
              style={{ backdropFilter: 'blur(6px) saturate(160%)', WebkitBackdropFilter: 'blur(6px) saturate(160%)' }}
              className="relative overflow-hidden bg-gradient-to-b from-[#8f0024]/70 via-[#800020]/60 to-[#6b001a]/70 px-5 pt-5 pb-6 text-white shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.45)] sm:px-7 sm:pt-6"
            >
              {/* Glass specular top reflection */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-80" aria-hidden="true" />

              {/* Preserved ambient corner decorations */}
              <div className="absolute -top-14 -right-10 size-36 rounded-full border border-white/20 bg-white/[0.04]" aria-hidden="true" />
              <div className="absolute -top-5 -right-4 size-20 rounded-full bg-[#D5A600]/30 blur-[1px]" aria-hidden="true" />

              <div className="relative z-10 flex items-start justify-between gap-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-white uppercase shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.4)] backdrop-blur-md">
                    <Info aria-hidden="true" className="size-3" />
                    Important information
                  </span>
                  <h2 id="announcement-title" className="mt-4 text-xl font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] sm:text-2xl">
                    Office Hours &amp; Service Availability
                  </h2>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeAnnouncement}
                  aria-label="Close announcement"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-200 hover:border-white/50 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-95"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <div className="bg-white px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#167C45]">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#EAF7EF]">
                  <Check aria-hidden="true" className="size-3" />
                </span>
                Operational as usual
              </div>
              <p id="announcement-description" className="mt-4 text-sm leading-6 text-[#51494A] sm:text-[15px]">
                Our team is available for legal, visa, and business consultations during the following operational hours.
              </p>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#800020]/10 bg-[#FBF8F8] p-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#800020] shadow-sm">
                  <Clock3 aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#292323]">Monday–Friday</p>
                  <p className="mt-1 text-xs leading-5 text-[#746B6C]">09:00–17:00 WITA · WhatsApp responses follow our operational hours.</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-[#8A8182]">This is temporary announcement content and can be adjusted after review.</p>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAnnouncement}
                  className="h-10 rounded-lg border border-[#D8D1D2] px-5 text-sm font-semibold text-[#51494A] transition hover:bg-[#F7F4F4] focus-visible:ring-2 focus-visible:ring-[#800020]/20 focus-visible:outline-none"
                >
                  Got it
                </button>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#800020] px-5 text-sm font-semibold text-white transition hover:bg-[#68001A] focus-visible:ring-2 focus-visible:ring-[#800020]/30 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <IconWhatsapp aria-hidden="true" className="size-4" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
