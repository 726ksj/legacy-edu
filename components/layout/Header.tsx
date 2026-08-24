import Image from "next/image";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";
import MobileNav from "./MobileNav";
import EnrollmentButton from "./EnrollmentButton";

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

const NAV_ITEMS: NavItem[] = [
  {
    label: "LEGACY를 소개합니다",
    href: "/about",
    children: [{ label: "대표 인사말", href: "/about/greeting" }],
  },
  {
    label: "커리큘럼",
    href: "/curriculum",
    children: [{ label: "LEGACY 커리큘럼", href: "/curriculum/legacy" }],
  },
  {
    label: "수강생 Review",
    href: "/reviews/course",
    children: [
      { label: "수강 후기", href: "/reviews/course" },
      { label: "강좌 후기", href: "/reviews/lecture" },
      { label: "학원 실제 후기", href: "/reviews/youtube" },
    ],
  },
  {
    label: "고객센터",
    href: "/customer-center",
    children: [
      { label: "공지사항", href: "/notice" },
      { label: "자주하는 질문", href: "/customer-center" },
      { label: "1:1 이용문의", href: "/customer-center/inquiry" },
    ],
  },
];

const EMAIL_DOMAIN = "legacyedu.local";

export default async function Header() {
  const user = await getAuthUser();

  const isAdmin =
    Boolean(process.env.ADMIN_USERNAME) &&
    user?.email === `${process.env.ADMIN_USERNAME}@${EMAIL_DOMAIN}`;

  const navItems: NavItem[] = [
    ...NAV_ITEMS,
    isAdmin
      ? {
          // 관리자 계정은 마이페이지 하위 메뉴(나의 강좌 등)가 의미 없으니
          // 관리자 페이지로 바로 돌아가는 링크만 보여준다.
          label: "관리자 페이지",
          href: "/admin",
        }
      : {
          label: "마이페이지",
          href: "/mypage",
          children: [
            { label: "나의 강좌", href: "/my-classroom" },
            { label: "나의 메모", href: "/mypage/notes" },
            { label: "장바구니", href: "/mypage/cart" },
            { label: "주문내역", href: "/mypage/orders" },
            { label: "점수 리포트", href: "/mypage/score-report" },
            { label: "회원정보 관리", href: "/settings" },
          ],
        },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      {/* 상단: 로고 + 로그인/회원가입. 데스크톱은 로고 정중앙, 모바일은 좌우 분리 배치 */}
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
          {user ? (
            <>
              <EnrollmentButton />
              <form action={logout}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark sm:px-4 sm:py-2 sm:text-sm md:px-6 md:py-2.5 md:text-base"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
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
            </>
          )}
          <MobileNav navItems={navItems} />
        </div>
      </div>

      {/* 하단: 굵은 대분류 메뉴 + 커서를 올리면 나오는 세부 메뉴 */}
      <nav className="hidden border-t border-zinc-100 bg-zinc-50 md:block">
        <ul className="flex w-full items-start justify-between gap-6 px-5 sm:px-8 lg:px-12">
          {navItems.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const labelClassName =
              "flex items-center gap-1 py-4 text-base font-bold text-zinc-800 transition-colors group-hover:text-brand-dark lg:text-lg";

            return (
            <li key={item.href} className="group relative">
              {hasChildren ? (
                <span className={labelClassName}>
                  {item.label}
                  {item.badge && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      NEW
                    </span>
                  )}
                </span>
              ) : (
                <Link href={item.href} className={labelClassName}>
                  {item.label}
                  {item.badge && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      NEW
                    </span>
                  )}
                </Link>
              )}

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
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
