import type { Metadata } from "next";
import "./globals.css";
import KakaoInAppRedirect from "@/components/layout/KakaoInAppRedirect";

export const metadata: Metadata = {
  title: "LEGACY EDU",
  description: "고등 내신 & 수능 전문 교육 플랫폼 LEGACY EDU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <KakaoInAppRedirect />
        {children}
      </body>
    </html>
  );
}
