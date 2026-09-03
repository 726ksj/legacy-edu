"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import NoticeNewBadge from "./NoticeNewBadge";

interface NavChild {
  label: string;
  href: string;
  badge?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  badge?: boolean;
  children?: NavChild[];
}

export default function MobileNav({
  navItems,
  recentNoticeId,
}: {
  navItems: NavItem[];
  recentNoticeId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (href: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-30 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const isExpanded = expanded.has(item.href);

              return (
                <div key={item.href}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.href)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between gap-1.5 rounded-md px-3 py-2.5 text-sm font-bold text-zinc-800 hover:bg-zinc-100 hover:text-brand-dark"
                    >
                      <span className="flex items-center gap-1.5">
                        {item.label}
                        {item.badge && (
                          <NoticeNewBadge noticeId={recentNoticeId} />
                        )}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-bold text-zinc-800 hover:bg-zinc-100 hover:text-brand-dark"
                    >
                      {item.label}
                      {item.badge && (
                        <NoticeNewBadge noticeId={recentNoticeId} />
                      )}
                    </Link>
                  )}

                  {hasChildren && isExpanded && (
                    <div className="ml-3 flex flex-col gap-0.5 border-l border-zinc-100 pl-3">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-normal text-zinc-600 hover:bg-zinc-100 hover:text-brand-dark"
                        >
                          {child.label}
                          {child.badge && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                              NEW
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
