import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Jost } from "next/font/google";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import { profile } from "@/content/profile";
import { NOINDEX, SITE_URL } from "@/lib/site";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${profile.name}: product, engineering and program work`,
    template: `%s · ${profile.name}`,
  },
  description: profile.description,
  authors: [{ name: profile.name, url: SITE_URL }],
  alternates: { canonical: "/" },
  ...(NOINDEX ? { robots: { index: false, follow: false } } : {}),
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: profile.name,
    title: `${profile.name}: product, engineering and program work`,
    description: profile.description,
  },
  twitter: {
    card: "summary_large_image",
    title: profile.name,
    description: profile.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} ${plexMono.variable} antialiased`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
