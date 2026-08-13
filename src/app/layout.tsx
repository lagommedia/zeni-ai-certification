import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { manrope } from "@/fonts/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeni Certification",
  description: "Zeni Certification training platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
