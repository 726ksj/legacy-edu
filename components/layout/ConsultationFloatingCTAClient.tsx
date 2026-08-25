"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const HIDDEN_PATHS = ["/consultation", "/login", "/signup"];

export default function ConsultationFloatingCTAClient() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <Link
        href="/consultation"
        className="group pointer-events-auto flex items-center gap-2.5 rounded-full bg-gradient-to-r from-accent to-accent-dark px-8 py-4 text-lg font-bold text-white shadow-[0_8px_30px_rgba(197,119,131,0.35)] ring-1 ring-white/15 transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_12px_36px_rgba(197,119,131,0.45)] active:scale-95 sm:px-9 sm:py-5 sm:text-xl"
      >
        <MessageCircle
          className="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:-rotate-6 sm:h-7 sm:w-7"
          strokeWidth={2.2}
        />
        상담 신청하기
      </Link>
    </div>
  );
}
