import IconEmail from '@/icons/BrandIconEmail';
import IconMap from '@/icons/BrandIconMap';
import IconWhatsapp from '@/icons/BrandIconWhatsapp';
import IconInstagram from '@/icons/BrandIconInstagram';
import { ContactForm } from './form-contact';

export function ContactSection() {
  return (
    <section id="contact-section" className="brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col md:px-10 lg:px-25">
      <div className="flex flex-col items-center px-5 sm:px-10 md:px-0">
        <h2 className="brand-h1 text-brand-maroon text-center text-balance">
          Diputra <span className="brand-h1-semi text-brand-black">Signature Indonesia</span>
        </h2>
        <p className="brand-p mb-5 sm:mb-6 lg:mb-7">Contact Us</p>
        <p className="brand-p-desc text-center lg:w-3xl">
          Contact us for consultations or inquiries regarding legal, visa, or business services in Bali. Our team is ready to provide fast responses and clear, reliable solutions.
        </p>
      </div>
      <div className="flex flex-col gap-10 sm:gap-14 md:flex-row md:gap-20">
        <div className="flex flex-col gap-7 px-5 py-5 max-md:order-2 sm:px-10 sm:py-10 md:px-0 md:py-0 lg:w-full">
          <h3 className="brand-h2 text-brand-maroon border-brand-yellow border-l-4 pl-5 font-semibold">Information</h3>
          <div className="flex h-full flex-col gap-3 sm:gap-4">
            <address className="flex flex-row items-center gap-2.5 not-italic">
              <IconMap className="size-5 text-black" />
              <span className="brand-p">Jalan Gunung Bahlil, Denpasar, Bali, Indonesia</span> {/* Next penulisannya harus gini untuk SEO*/}
            </address>
            <a href="mailto:DSIInfo@diputraSignature.com" className="flex flex-row items-center gap-2.5">
              <IconEmail className="size-5 text-black" />
              <span className="brand-p">DSIInfo@diputraSignature.com</span>
            </a>
            <a href="https://wa.me/" className="flex flex-row items-center gap-2.5">
              <IconWhatsapp className="size-5 text-black" />
              <p className="brand-p">+62811234567890</p>
            </a>
          </div>
          <div className="py-2.5 max-md:flex max-md:items-center max-md:gap-2.5 max-md:border-y md:border-t md:pt-2.5 md:pb-0">
            <p className="brand-p">Follow Us:</p>
            <div className="flex md:mt-2.5">
              <IconInstagram className="size-5 text-black" />
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
