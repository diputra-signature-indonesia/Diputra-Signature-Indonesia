// src/app/layout.tsx
import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

export const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  weight: ["100","200","300","400","500","600","700","800","900"], // lengkap
});

export const metadata: Metadata = {
  title: "Diputra Signature Indonesia",
  description: "Website resmi Diputra Signature Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${raleway.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
