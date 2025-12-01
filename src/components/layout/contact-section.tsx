import IconEmail from "@/icons/BrandIconEmail"
import IconMap from "@/icons/BrandIconMap"
import IconWhatsapp from "@/icons/BrandIconWhatsapp"
import IconInstagram from "@/icons/BrandIconInstagram"
import { ContactForm } from "./contact-form"

export function ContactSection(){

    return(
        <section className="flex flex-col max-w-[1440px] mx-auto brand-section-px brand-section-py **:brand-stretch **:font-raleway">
            <div className="flex flex-col items-center">
                <h2 className="brand-h1 text-brand-maroon text-balance text-center">Diputra <span className="brand-h1-semi text-brand-black ">Signature Indonesia</span></h2>
                <p className="brand-p mb-5 sm:mb-6 lg:mb-7">Contact Us</p>
                <p className="brand-p-desc text-center lg:w-3xl">Hubungi kami untuk konsultasi atau pertanyaan terkait layanan legal, imigrasi, dan bisnis. Tim kami siap membantu Anda dengan respons cepat dan solusi yang jelas.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-10 md:gap-20">
                <div className="flex flex-col gap-7 lg:w-full max-md:order-2">
                    <h3 className="brand-h2 font-semibold text-brand-maroon">Let's Talk</h3>
                    <div className="size-full flex flex-col gap-3 sm:gap-4">
                        <div className="flex flex-col h-fit">
                            <address className="not-italic">
                                <div className="flex flex-row gap-2.5 items-center">
                                    <IconMap className="size-5 text-black" />
                                    <span className="brand-p">Jalan Gunung Bahlil</span>
                                </div>
                            </address>
                        </div>
                        <div className="flex flex-col h-fit">
                            <a href="mailto:DSIInfo@diputraSignature.com" className="flex flex-row gap-2.5 items-center">
                                <IconEmail className="size-5 text-black"/>
                                <span className="brand-p">DSIInfo@diputraSignature.com</span>
                            </a>
                        </div>
                        <div className="flex flex-col h-fit">
                            <a href="https://wa.me/" className="flex flex-row gap-2.5 items-center">
                                <IconWhatsapp className="size-5 text-black" />
                                <p className="brand-p">+62811234567890</p>
                            </a>
                        </div>
                    </div>
                    <div className="border-t pt-2.5">
                        <p className="brand-p">Follow Us</p>
                        <div className="flex mt-2.5">
                            <IconInstagram className="size-5 text-black"/>
                        </div>
                    </div>
                </div>
                <ContactForm/>
            </div>
        </section>
    )
}