import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "wh05h3ar",
  description: "A modern EVP session app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void text-white antialiased">{children}</body>
    </html>
  );
}
