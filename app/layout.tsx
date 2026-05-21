import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Inky's Space",
  description: "A small space for poems. Quiet, private, alive.",
};

export const viewport: Viewport = {
  themeColor: "#03050d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-night-950 text-ink-silver antialiased">
        <ChunkErrorRecovery />
        <div className="aurora" aria-hidden />
        <div className="relative z-10 min-h-svh">{children}</div>
      </body>
    </html>
  );
}
