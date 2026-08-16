import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import HeaderAuthSection from "./HeaderAuthSection";
import HeaderNavBar from "./HeaderNavBar";
import { GUEST_NAV_ITEMS, type NavItem } from "./nav-items";

// 로그인 여부는 요청마다 달라지므로, 로고/뼈대는 즉시 내려주고
// 인증에 의존하는 조각(우측 버튼, 하단 메뉴)만 Suspense로 스트리밍한다.
// 이렇게 나눠야 로그인과 무관한 페이지들이 정적 셸로 캐시될 수 있다.
export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="relative flex h-16 w-full items-center justify-between px-4 sm:px-8 md:h-20 md:justify-end lg:px-12">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-1.5 md:absolute md:left-1/2 md:top-1/2 md:shrink-0 md:-translate-x-1/2 md:-translate-y-1/2 md:gap-2.5"
        >
          <Image
            src="/logo.png"
            alt="LEGACY EDU"
            width={32}
            height={32}
            className="h-6 w-6 shrink-0 md:h-8 md:w-8"
          />
          <span className="truncate text-base font-bold tracking-tight text-brand-dark sm:text-lg md:text-xl lg:text-2xl">
            LEGACY EDU
          </span>
        </Link>

        <Suspense fallback={<HeaderActionsFallback />}>
          <HeaderAuthSection />
        </Suspense>
      </div>

      <Suspense fallback={<HeaderNavFallback navItems={GUEST_NAV_ITEMS} />}>
        <HeaderNavBar />
      </Suspense>
    </header>
  );
}

function HeaderActionsFallback() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
      <Link
        href="/login"
        className="whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark sm:px-4 sm:py-2 sm:text-sm md:px-6 md:py-2.5 md:text-base"
      >
        로그인
      </Link>
      <Link
        href="/signup"
        className="whitespace-nowrap rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark sm:px-4 sm:py-2 sm:text-sm md:px-6 md:py-2.5 md:text-base"
      >
        회원가입
      </Link>
      {/* MobileNav는 클라이언트 컴포넌트라 셸 단계에선 자리표시자로 대체 */}
      <div className="h-9 w-9 shrink-0 md:hidden" aria-hidden />
    </div>
  );
}

function HeaderNavFallback({ navItems }: { navItems: NavItem[] }) {
  return (
    <nav className="hidden border-t border-zinc-100 bg-zinc-50 md:block">
      <ul className="flex w-full items-start justify-between gap-6 px-5 sm:px-8 lg:px-12">
        {navItems.map((item) => (
          <li key={item.href} className="group relative">
            <span className="flex items-center gap-1 py-4 text-base font-bold text-zinc-800 transition-colors group-hover:text-brand-dark lg:text-lg">
              {item.label}
              {item.badge && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  NEW
                </span>
              )}
            </span>

            {item.children && item.children.length > 0 && (
              <div className="pointer-events-none absolute left-1/2 top-full z-20 flex w-max min-w-44 -translate-x-1/2 flex-col items-center gap-2 rounded-b-md border border-t-0 border-zinc-100 bg-white px-4 pb-3 pt-2 opacity-0 shadow-md transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="flex items-center gap-1 whitespace-nowrap text-sm font-normal text-zinc-600 transition-colors hover:text-brand-dark"
                  >
                    {child.label}
                    {child.badge && (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                        NEW
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
