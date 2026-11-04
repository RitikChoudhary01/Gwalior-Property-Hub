import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Gwalior Property Hub — Buy & Sell Residential Property in India",
    template: "%s | Gwalior Property Hub",
  },
  description:
    "Gwalior Property Hub is a premium Indian real estate marketplace. Discover verified residential properties, explore projects from trusted developers, and connect directly with owners and builders.",
  keywords: [
    "real estate India",
    "buy property",
    "apartments",
    "villas",
    "residential plots",
    "property marketplace",
    "Gwalior Property Hub",
  ],
  authors: [{ name: "Gwalior Property Hub" }],
  openGraph: {
    title: "Gwalior Property Hub — Find a Place You'll Love to Call Home",
    description:
      "Discover residential properties, explore verified listings and connect with property owners and trusted developers.",
    siteName: "Gwalior Property Hub",
    type: "website",
    images: ["/images/hero.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gwalior Property Hub — Find a Place You'll Love to Call Home",
    description: "Premium Indian real estate marketplace for buyers, owners and developers.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1D6B4F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${body.variable} ${display.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
