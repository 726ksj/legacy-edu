import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/auth-actions";
import { buildNavItems } from "./nav-items";
import MobileNav from "./MobileNav";

const EMAIL_DOMAIN = "legacyedu.local";

export default async function HeaderAuthSection() {
  const user = await getAuthUser();

  const isAdmin =
    Boolean(process.env.ADMIN_USERNAME) &&
    user?.email === `${process.env.ADMIN_USERNAME}@${EMAIL_DOMAIN}`;

  const navItems = buildNavItems(isAdmin);

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
      {user ? (
        <form action={logout}>
          <button
            type="submit"
            className="whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-dark sm:px-4 sm:py-2 sm:text-sm md:px-6 md:py-2.5 md:text-base"
          >
            로그아웃
          </button>
        </form>
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
  );
}
