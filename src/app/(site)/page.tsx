import { BrandButton } from "@/app/components/ui/button"

export default function HomePage() {
  return (
    <div>
      <BrandButton variant="yellow">Contact Us</BrandButton>
      <BrandButton variant="white">Contact Us</BrandButton>
      <BrandButton variant="black">Contact Us</BrandButton>
      <div className="flex flex-row">
        <BrandButton variant="red">Contact Us</BrandButton>
        <BrandButton variant="red" loading={true}>Contact Us</BrandButton>
      </div>
      <BrandButton variant="ghost">Contact Us</BrandButton>
      <p className="font-raleway">HELLOW WORDL</p>
      <p className="font-raleway tracking-wider">HELLOW WORDL</p>
      <p className="w-1/6 font-raleway leading-[125%]">Menyederhanakan kebutuhan bisnis, legal, dan imigrasi secara profesional, transparan, dan berintegritas.</p>


    </div>
  );
}