import IconMap from "@/icons/BrandIconMap"
import IconEmail from "@/icons/BrandIconEmail"
import IconWhatsapp from "@/icons/BrandIconWhatsapp"
import IconArrow from "@/icons/BrandIconArrow"

export function SiteFooter(){
    return (
        <div className="w-full flex flex-col bg-brand-black py-20 brand-section-px text-white gap-5 **:font-raleway">
            <p className=" font-semibold text-2xl sm:text-3xl text-brand-yellow brand-stretch">
                Diputra
                <span className="font-light brand-h3 text-brand-white brand-stretch"> Signature Indonesia</span>
            </p>
            <div className="flex flex-col lg:flex-row gap-20 xl:gap-40">
                <div className="flex flex-col w-full gap-5">
                    <p className="brand-p brand-stretch">We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia</p>
                    <div className="flex flex-col w-full gap-4">
                        <div className="flex flex-col h-fit">
                            <div className="flex flex-row gap-2.5 items-center">
                                <IconMap className="size-5" />
                                <p className="font-raleway brand-stretch brand-p">Jalan Gunung Bahlil</p>
                            </div>
                        </div>
                        <div className="flex flex-col h-fit">
                            <div className="flex flex-row gap-2.5 items-center">
                                <IconEmail className="size-5" />
                                <p className="font-raleway brand-stretch brand-p">DSIInfo@diputraSignature.com</p>
                            </div>
                        </div>
                        <div className="flex flex-col h-fit">
                            <div className="flex flex-row gap-2.5 items-center">
                                <IconWhatsapp className="size-5" />
                                <p className="font-raleway brand-stretch brand-p">+62811234567890</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row w-full gap-10 sm:gap-20 xl:gap-40">
                    <div className="flex flex-col gap-5">
                        <p className="font-raleway brand-h3 text-brand-yellow">Our Services</p>
                        <div className="flex flex-col w-full gap-4">
                            <p className="font-raleway brand-p brand-stretch">Legal</p>
                            <p className="font-raleway brand-p brand-stretch">Visa</p>
                            <p className="font-raleway brand-p brand-stretch">Real Estate</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-5">
                        <p className="font-raleway brand-h3 text-brand-yellow">Navigation</p>
                        <div className="flex flex-col w-full gap-4">
                            <p className="font-raleway brand-p brand-stretch">Home</p>
                            <p className="font-raleway brand-p brand-stretch">About</p>
                            <p className="font-raleway brand-p brand-stretch">Contact Us</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="pt-2.5 mt-20 border-t border-brand-gray font-raleway brand-p brand-stretch">
                <p>copyright</p>
            </div>
        </div>
    )
}