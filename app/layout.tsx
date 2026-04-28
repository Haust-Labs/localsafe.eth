import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "localsafe.eth",
  description: "Multi-Signature Wallet Interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="haust" className={`${inter.className} min-h-screen`}>
      <body className="bg-base-100 flex min-h-screen flex-col antialiased">{children}</body>
    </html>
  );
}
