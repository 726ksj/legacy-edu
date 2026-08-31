"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { label: "홈/소개 문구 관리", href: "/admin/content" },
  { label: "팝업 관리", href: "/admin/popups" },
  { label: "상담 신청 관리", href: "/admin/consultations" },
  { label: "회원코드 관리", href: "/admin/member-codes" },
  { label: "회원 관리", href: "/admin/users" },
  { label: "FAQ 관리", href: "/admin/faqs" },
  { label: "1:1 문의 관리", href: "/admin/inquiries" },
  { label: "수강생 Review 관리", href: "/admin/reviews" },
  { label: "강사 관리", href: "/admin/instructors" },
  { label: "강좌 관리", href: "/admin/courses" },
  { label: "주문/결제 관리", href: "/admin/orders" },
  { label: "메모 관리", href: "/admin/notes" },
  { label: "수강 권한 관리", href: "/admin/enrollments" },
  { label: "성적 관리", href: "/admin/score-report-categories" },
];

export default function AdminSidebar({
  hasNewNote = false,
  pendingConsultationCount = 0,
  pendingInquiryCount = 0,
}: {
  hasNewNote?: boolean;
  pendingConsultationCount?: number;
  pendingInquiryCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 print:hidden md:hidden">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-brand-dark">
            LEGACY EDU
          </span>
          <span className="text-xs font-medium text-zinc-400">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 -translate-x-full flex-col border-r border-zinc-200 bg-white transition-transform duration-200 print:hidden md:static md:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-6">
          <div className="flex items-center">
            <Link href="/" className="text-lg font-bold text-brand-dark">
              LEGACY EDU
            </Link>
            <span className="ml-2 text-xs font-medium text-zinc-400">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-light text-brand-dark"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                {item.label}
                {item.href === "/admin/notes" && hasNewNote && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    NEW
                  </span>
                )}
                {item.href === "/admin/consultations" &&
                  pendingConsultationCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white">
                      {pendingConsultationCount > 99
                        ? "99+"
                        : pendingConsultationCount}
                    </span>
                  )}
                {item.href === "/admin/inquiries" && pendingInquiryCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white">
                    {pendingInquiryCount > 99 ? "99+" : pendingInquiryCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-3">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Home className="h-4 w-4" />
            사이트 홈으로 돌아가기
          </Link>
        </div>
      </aside>
    </>
  );
}
