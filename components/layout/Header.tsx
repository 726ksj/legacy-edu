import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";
import MobileNav from "./MobileNav";

const NAV_ITEMS = [
  { label: "LEGACY를 소개합니다", href: "/about" },
  { label: "나의 강의실", href: "/my-classroom" },
  { label: "NOTICE", href: "/notice" },
  { label: "나의 Q&A", href: "/my-qna" },
  { label: "고객센터", href: "/customer-center" },
];

const EMAIL_DOMAIN = "legacyedu.local";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin =
    Boolean(process.env.ADMIN_USERNAME) &&
    user?.email === `${process.env.ADMIN_USERNAME}@${EMAIL_DOMAIN}`;

  let hasUnreadQna = false;
  if (user) {
    const { data: unreadAnswer } = await supabase
      .from("questions")
      .select("id")
      .eq("profile_id", user.id)
      .not("answer", "is", null)
      .is("answer_read_at", null)
      .limit(1)
      .maybeSingle();
    hasUnreadQna = Boolean(unreadAnswer);
  }

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.href === "/my-qna" && hasUnreadQna,
  }));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <Image
            src="/logo.png"
            alt="LEGACY EDU"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0"
          />
          <span className="truncate text-base font-bold tracking-tight text-brand-dark sm:text-xl">
            LEGACY EDU
          </span>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            고등 내신&수능 전문
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1 text-sm font-medium text-zinc-700 transition-colors hover:text-brand-dark"
            >
              {item.label}
              {item.badge && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  NEW
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {user ? (
            <>
              <Link
                href={isAdmin ? "/admin" : "/mypage"}
                className="whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-zinc-700 hover:text-brand-dark sm:px-3 sm:text-sm"
              >
                MY PAGE
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark sm:px-4 sm:text-sm"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark sm:px-4 sm:text-sm"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="whitespace-nowrap rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark sm:px-4 sm:text-sm"
              >
                회원가입
              </Link>
            </>
          )}
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
