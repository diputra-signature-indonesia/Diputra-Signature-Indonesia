import IconEmail from '@/icons/BrandIconEmail';
import IconMap from '@/icons/BrandIconMap';
import IconWhatsapp from '@/icons/BrandIconWhatsapp';
import IconInstagram from '@/icons/BrandIconInstagram';
import { ContactForm } from './contact-form';

export function ContactSection() {
  return (
    <section id="contact-section" className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col">
      <div className="flex flex-col items-center">
        <h2 className="brand-h1 text-brand-maroon text-center text-balance">
          Diputra <span className="brand-h1-semi text-brand-black">Signature Indonesia</span>
        </h2>
        <p className="brand-p mb-5 sm:mb-6 lg:mb-7">Contact Us</p>
        <p className="brand-p-desc text-center lg:w-3xl">
          Hubungi kami untuk konsultasi atau pertanyaan terkait layanan legal, imigrasi, dan bisnis. Tim kami siap membantu Anda dengan respons cepat dan solusi yang jelas.
        </p>
      </div>
      <div className="flex flex-col gap-10 max-md:gap-20 md:flex-row md:gap-20">
        <div className="flex flex-col gap-7 max-md:order-2 lg:w-full">
          <h3 className="brand-h2 text-brand-maroon font-semibold">Let's Talk</h3>
          <div className="flex size-full flex-col gap-3 sm:gap-4">
            <div className="flex h-fit flex-col">
              <address className="not-italic">
                <div className="flex flex-row items-center gap-2.5">
                  <IconMap className="size-5 text-black" />
                  <span className="brand-p">Jalan Gunung Bahlil</span>
                </div>
              </address>
            </div>
            <div className="flex h-fit flex-col">
              <a href="mailto:DSIInfo@diputraSignature.com" className="flex flex-row items-center gap-2.5">
                <IconEmail className="size-5 text-black" />
                <span className="brand-p">DSIInfo@diputraSignature.com</span>
              </a>
            </div>
            <div className="flex h-fit flex-col">
              <a href="https://wa.me/" className="flex flex-row items-center gap-2.5">
                <IconWhatsapp className="size-5 text-black" />
                <p className="brand-p">+62811234567890</p>
              </a>
            </div>
          </div>
          <div className="border-t pt-2.5">
            <p className="brand-p">Follow Us</p>
            <div className="mt-2.5 flex">
              <IconInstagram className="size-5 text-black" />
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
