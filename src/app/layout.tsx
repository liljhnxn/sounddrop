import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "SoundDrop | Discover. Share. Repeat.",
  description:
    "A decentralized music-discovery platform where users share songs they love and explore music recommendations from other people on Botchain.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0B0D] text-white min-h-screen antialiased selection:bg-[#DFFF00] selection:text-black">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

