import type { Metadata } from "next";
import { EnvBadge } from "@/components/dashboard/env-badge";
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="antialiased">
        {children}
        <EnvBadge />
      </body>
    </html>
  );
}
