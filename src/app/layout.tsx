import type { Metadata, Viewport } from "next";
import { Orbitron, Playfair_Display, Share_Tech_Mono, Source_Sans_3 } from "next/font/google";
import {
  PRODUCT_METADATA_DESCRIPTION,
  PRODUCT_METADATA_TITLE,
} from "../lib/interpreter/branding";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  // Avoid Chrome "preloaded but not used" on pages that are mostly body sans (e.g. /voice).
  preload: false,
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  // /voice is drifting toward a stripped HUD shell; avoid noisy font-preload warnings.
  preload: false,
});

/** Cinematic HUD: display + LCD (matches Kandor web-cinematic typography) */
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["500", "700", "800"],
  display: "swap",
  preload: false,
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-share-tech-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: PRODUCT_METADATA_TITLE,
  description: PRODUCT_METADATA_DESCRIPTION,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "any" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${playfair.variable} ${sourceSans.variable} ${orbitron.variable} ${shareTechMono.variable}`}
    >
      <body className="min-h-screen bg-zinc-950 font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
