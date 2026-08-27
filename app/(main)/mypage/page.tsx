import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";

export const dynamic = "force-dynamic";

const MYPAGE_LINKS = [
  { label: "나의 강좌", href: "/my-classroom" },
  { label: "나의 메모", href: "/mypage/notes" },
  { label: "장바구니", href: "/mypage/cart" },
  { label: "주문내역", href: "/mypage/orders" },
  { label: "점수 리포트", href: "/mypage/score-report" },
  { label: "회원정보 관리", href: "/settings" },
];

export default async function MyPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">마이페이지</h1>
      </div>

      <ul className="flex flex-col gap-3">
        {MYPAGE_LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <form action={logout}>
        <button
          type="submit"
          className="w-fit rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-brand hover:text-brand-dark"
        >
          로그아웃
        </button>
      </form>
    </section>
  );
}
