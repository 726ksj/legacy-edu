"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function EnrollmentButton() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="min-w-16 whitespace-nowrap rounded-md bg-accent px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-accent-dark sm:min-w-[84px] sm:px-4 sm:py-2 sm:text-sm md:min-w-[108px] md:px-6 md:py-2.5 md:text-base"
      >
        수강신청
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 flex w-28 flex-col overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-md">
          <Link
            href="/courses/high"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-brand-dark"
          >
            고등
          </Link>
          <Link
            href="/courses/middle"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-brand-dark"
          >
            중등
          </Link>
        </div>
      )}
    </div>
  );
}
