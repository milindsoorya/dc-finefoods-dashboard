import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DC Fine Foods — Internal Dashboard",
  description:
    "Internal operations dashboard for DC Fine Foods cashew processing pipeline. Track intake, processing, grading, quality, packaging, stock, and shipments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
