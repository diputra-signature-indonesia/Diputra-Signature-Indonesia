import { BlogSection } from "@/components/layout/blog-section";
import { ContactSection } from "@/components/layout/contact-section";
import { ServicesSection } from "@/components/layout/services-section";

export default function HomePage() {
  return (
    <div>
      <ServicesSection/>
      <ContactSection/>
      <BlogSection/>
    </div>
  );
}