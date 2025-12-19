import IconEmail from '@/icons/BrandIconEmail';
import IconMap from '@/icons/BrandIconMap';
import IconWhatsapp from '@/icons/BrandIconWhatsapp';
import IconInstagram from '@/icons/BrandIconInstagram';
import { ContactForm } from './section-contact-form';

export function ContactSection() {
  return (
    <section id="contact-section" aria-labelledby="contact-heading" className="brand-stretch font-raleway mx-auto flex flex-col md:px-10 lg:px-25 xl:max-w-[1440px]">
      <div className="px-5 sm:px-10 md:px-0">
        <h2 id="contact-heading" className="brand-h1 text-brand-maroon border-brand-yellow brand-h1-mb border-l-4 pl-7">
          Contact <span className="brand-h1-semi text-black">Us</span>
        </h2>
      </div>
      <div className="md-13 flex flex-col gap-10 sm:gap-14 md:flex-row xl:gap-20">
        <div className="flex w-full flex-col gap-7 px-5 py-5 sm:px-10 sm:py-10 md:px-0 md:py-0">
          <div className="flex flex-col">
            <p className="brand-p">
              Contact us for consultations or inquiries regarding legal, visa, or business services in Bali. Our team is ready to provide fast responses and clear, reliable solutions.
            </p>
          </div>
          <div className="flex h-full flex-col gap-3 sm:gap-2.5">
            <address className="flex flex-row items-center gap-2.5 not-italic">
              <IconMap className="size-5 text-black" />
              {/* samakan nanti dengan di schema-dsi.ts */}
              <span className="brand-p">Jalan Gunung Bahlil, Denpasar, Bali, Indonesia</span>
            </address>
            <a href="mailto:DSIInfo@diputraSignature.com" aria-label="Email Diputra Signature Indonesia" className="flex flex-row items-center gap-2.5">
              <IconEmail className="size-5 text-black" />
              <span className="brand-p">DSIInfo@diputraSignature.com</span>
            </a>
            <a href="https://wa.me/" aria-label="Chat with Diputra Signature Indonesia on WhatsApp" className="flex flex-row items-center gap-2.5">
              <IconWhatsapp className="size-5 text-black" />
              <p className="brand-p">+62811234567890</p>
            </a>
          </div>
          <div className="py-2.5 max-md:flex max-md:items-center max-md:gap-2.5 max-md:border-y md:border-t md:pt-2.5 md:pb-0">
            <p className="brand-p">Follow Us:</p>
            <div className="flex md:mt-2.5">
              <a href="https://www.instagram.com/xxxx" target="_blank" rel="noopener noreferrer" aria-label="Diputra Signature Indonesia Instagram">
                <IconInstagram className="size-5 text-black" />
              </a>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
