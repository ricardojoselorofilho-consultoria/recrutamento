import type { Metadata } from "next";
import { Source_Serif_4, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const serif = Source_Serif_4({ subsets: ["latin"], variable: "--fonte-serif", display: "swap" });
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--fonte-sans", display: "swap" });

export const metadata: Metadata = {
  title: "RJL Consultoria: avaliação de perfil",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
