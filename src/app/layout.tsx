import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tamboo",
  description: "Gestão operacional de locação de tambores de entulho",
  manifest: "/manifest.json",
  icons: {
    apple: "/app-icon.png",
  },
};

export const viewport = {
  themeColor: "#EE4D2D",
};

import { ClientLayoutWrapper } from "@/components/ClientLayoutWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
