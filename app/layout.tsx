import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEGACY EDU",
  description: "분당/성남/수지 고등 내신 & 수능 전문 교육 플랫폼 LEGACY EDU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
