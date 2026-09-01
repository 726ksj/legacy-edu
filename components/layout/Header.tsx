import Link from "next/link";
import { createClient, getAuthUser, isAdmin } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";
import { getMemberRole } from "@/lib/teachers";
import MobileNav from "./MobileNav";
import EnrollmentButton from "./EnrollmentButton";

// 최근에 올라온 공지사항이면 상단 메뉴에 NEW 뱃지를 붙여준다. 게시글별
// "읽음" 상태를 추적하려면 로그인 여부와 무관하게 모든 방문자를 다뤄야
// 해서 복잡해지니, 등록된 지 며칠 안 된 글인지로 간단히 판단한다.
const NEW_NOTICE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function checkHasNewNotice(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data } = await supabase
    .from("notices")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  return Date.now() - new Date(data.created_at).getTime() < NEW_NOTICE_WINDOW_MS;
}

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
    label: "공지사항",
    href: "/notice",
  },
  {
    label: "고객센터",
    href: "/customer-center",
    children: [
      { label: "자주하는 질문", href: "/customer-center" },
      { label: "1:1 이용문의", href: "/customer-center/inquiry" },
    ],
  },
];

export default async function Header() {
  const supabase = await createClient();
  const [user, hasNewNotice] = await Promise.all([
    getAuthUser(),
    checkHasNewNotice(supabase),
  ]);

  const admin = isAdmin(user);
  // 선생님/조교 여부는 profiles.role 조회가 필요해서(JWT만으로는 알 수
  // 없음), 관리자가 아닌 로그인 사용자에 한해서만 확인한다.
  const role = Boolean(user) && !admin ? await getMemberRole(user!.id) : null;
  const teacher = role === "teacher";
  const assistant = role === "assistant";

  const navItems: NavItem[] = [
    ...NAV_ITEMS.map((item) =>
      item.href === "/notice" ? { ...item, badge: hasNewNotice } : item,
    ),
    ...(admin
      ? [
          // 관리자 계정은 마이페이지 하위 메뉴(나의 강의실 등)가 의미 없으니
          // 관리자 페이지로 바로 돌아가는 링크만 보여준다.
          { label: "관리자 페이지", href: "/admin" },
        ]
      : teacher || assistant
        ? [
            // 선생님/조교 계정은 학생용 마이페이지 하위 메뉴(나의 강의실/
            // 장바구니 등)가 다 의미 없으니, 여기엔 성적 관리 + 회원정보
            // 수정만 둔다. (선생님의 강의/공지 관리는 우측 상단 "강좌
            // 관리" 버튼으로 이미 갈 수 있어 중복으로 안 둔다.)
            { label: "성적 관리", href: "/mypage/grading" },
            { label: "회원정보 관리", href: "/settings" },
          ]
        : [
            {
              label: "마이페이지",
              href: "/mypage",
              children: [
                { label: "나의 강의실", href: "/my-classroom" },
                { label: "나의 메모", href: "/mypage/notes" },
                { label: "장바구니", href: "/mypage/cart" },
                { label: "주문내역", href: "/mypage/orders" },
                { label: "성적 리포트", href: "/mypage/score-report" },
                { label: "회원정보 관리", href: "/settings" },
              ],
            },
          ]),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      {/* 상단: 로고 + 로그인/회원가입. 데스크톱은 로고 정중앙, 모바일은 좌우 분리 배치 */}
      <div className="relative flex h-14 w-full items-center justify-between px-4 sm:px-8 md:h-16 md:justify-end lg:px-12">
        <Link
          href="/"
          className="flex min-w-0 shrink items-baseline text-base sm:text-lg md:absolute md:left-1/2 md:top-1/2 md:shrink-0 md:-translate-x-1/2 md:-translate-y-1/2 md:text-xl lg:text-2xl"
        >
          <span className="truncate text-[1em] font-bold tracking-tight text-brand-dark">
            LEGACY EDU
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
          {user ? (
            <>
              {teacher ? (
                <Link
                  href="/mypage/teaching"
                  className="min-w-16 whitespace-nowrap rounded-md bg-accent px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-accent-dark sm:min-w-[84px] sm:px-4 sm:py-2 sm:text-sm md:min-w-[108px] md:px-6 md:py-2.5 md:text-base"
                >
                  강좌 관리
                </Link>
              ) : assistant ? null : (
                <EnrollmentButton />
              )}
              <form action={logout}>
                <button
                  type="submit"
                  className="min-w-16 whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-center text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark sm:min-w-[84px] sm:px-4 sm:py-2 sm:text-sm md:min-w-[108px] md:px-6 md:py-2.5 md:text-base"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="min-w-16 whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-center text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark sm:min-w-[84px] sm:px-4 sm:py-2 sm:text-sm md:min-w-[108px] md:px-6 md:py-2.5 md:text-base"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="min-w-16 whitespace-nowrap rounded-md bg-brand px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-dark sm:min-w-[84px] sm:px-4 sm:py-2 sm:text-sm md:min-w-[108px] md:px-6 md:py-2.5 md:text-base"
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
        <ul className="mx-auto flex w-full max-w-6xl items-start justify-between gap-6 px-4 sm:px-6">
          {navItems.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const labelClassName =
              "flex items-center gap-1 py-3 text-base font-bold text-zinc-800 transition-colors group-hover:text-brand-dark lg:text-lg";

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
