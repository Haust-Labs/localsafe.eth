import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "localsafe.eth",
  description: "Multi-Signature Wallet Interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-screen">
      <body className="bg-base-100 flex min-h-screen flex-col antialiased">{children}</body>
    </html>
  );
}
