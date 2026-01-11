import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Truth Lens Server",
  description: "Backend for Truth Lens Extension",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
