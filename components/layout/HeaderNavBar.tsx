import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { buildNavItems } from "./nav-items";

const EMAIL_DOMAIN = "legacyedu.local";

export default async function HeaderNavBar() {
  const user = await getAuthUser();

  const isAdmin =
    Boolean(process.env.ADMIN_USERNAME) &&
    user?.email === `${process.env.ADMIN_USERNAME}@${EMAIL_DOMAIN}`;

  const navItems = buildNavItems(isAdmin);

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
