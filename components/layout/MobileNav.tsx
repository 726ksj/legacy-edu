"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import NoticeNewBadge from "./NoticeNewBadge";

interface NavChild {
  label: string;
  href: string;
  badge?: boolean;
  children?: NavChild[];
}

interface NavItem {
  label: string;
  href: string;
  badge?: boolean;
  children?: NavChild[];
}

function NavAccordionItems({
  items,
  expanded,
  toggleExpanded,
  onNavigate,
  recentNoticeId,
  depth = 0,
}: {
  items: NavChild[];
  expanded: Set<string>;
  toggleExpanded: (href: string) => void;
  onNavigate: () => void;
  recentNoticeId: string | null;
  depth?: number;
}) {
  // 최상위 항목(depth 0)은 자식 유무와 관계없이 굵게 표시하고, 하위
  // 항목은 그 항목이 또 자식을 가질 때만(예: "고등" > 트랙) 굵게 표시해
  // 그룹 제목처럼 보이게 한다.
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const isExpanded = expanded.has(item.href);
        const isBold = depth === 0 || hasChildren;
        const textClassName = isBold
          ? "text-sm font-bold text-zinc-800"
          : "text-sm font-normal text-zinc-600";
        const paddingClassName = depth === 0 ? "py-2.5" : "py-2";

        return (
          <div key={item.href}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpanded(item.href)}
                aria-expanded={isExpanded}
                className={`flex w-full items-center justify-between gap-1.5 rounded-md px-3 ${paddingClassName} ${textClassName} hover:bg-zinc-100 hover:text-brand-dark`}
              >
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {item.badge && <NoticeNewBadge noticeId={recentNoticeId} />}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
            ) : (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-1.5 rounded-md px-3 ${paddingClassName} ${textClassName} hover:bg-zinc-100 hover:text-brand-dark`}
              >
                {item.label}
                {item.badge && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    NEW
                  </span>
                )}
              </Link>
            )}

            {hasChildren && isExpanded && (
              <div className="ml-3 flex flex-col gap-0.5 border-l border-zinc-100 pl-3">
                <NavAccordionItems
                  items={item.children!}
                  expanded={expanded}
                  toggleExpanded={toggleExpanded}
                  onNavigate={onNavigate}
                  recentNoticeId={recentNoticeId}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
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

  const closeMenu = () => setOpen(false);

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
            <NavAccordionItems
              items={navItems}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onNavigate={closeMenu}
              recentNoticeId={recentNoticeId}
            />
          </nav>
        </div>
      )}
    </div>
  );
}
