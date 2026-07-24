import Link from "next/link";

const NAV_ITEMS = [
  { label: "LEGACY를 소개합니다", href: "/about" },
  { label: "수강신청", href: "/courses" },
  { label: "NOTICE", href: "/notice" },
  { label: "MY PAGE", href: "/mypage" },
  { label: "고객센터", href: "/customer-center" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-brand-dark">
            LEGACY EDU
          </span>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            고등 내신&수능 전문
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-zinc-700 transition-colors hover:text-brand-dark"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:text-brand-dark"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            회원가입
          </Link>
        </div>
      </div>
    </header>
  );
}
