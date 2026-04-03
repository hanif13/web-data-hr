import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fityatulhaq",
  description: "Modern Personnel and Camp Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
