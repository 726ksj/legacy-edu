import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CartList from "./CartList";

export const dynamic = "force-dynamic";

interface CartRow {
  id: string;
  courses: {
    id: string;
    title: string;
    subject: string;
    teacher_name: string;
    school: string | null;
    price: number;
  } | null;
}

export default async function CartPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage/cart")}`);
  }

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("cart_items")
    .select(
      "id, courses(id, title, subject, teacher_name, school, price)",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .returns<CartRow[]>();

  const items = (rows ?? [])
    .filter((row) => row.courses !== null)
    .map((row) => ({ cartItemId: row.id, course: row.courses! }));

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            장바구니
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            담아둔 강좌를 확인하고 결제를 진행하세요.
          </p>
        </div>
        <Link
          href="/courses/high"
          className="shrink-0 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 hover:border-brand hover:text-brand-dark"
        >
          + 강좌 더 담으러 가기
        </Link>
      </div>

      <div className="mt-8">
        <CartList items={items} />
      </div>
    </section>
  );
}
