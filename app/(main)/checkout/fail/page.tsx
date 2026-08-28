import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}) {
  const { message, orderId } = await searchParams;
  const user = await getAuthUser();

  // 로그인 + 본인 주문인지 확인한 뒤에만 상태를 건드린다. orderId는
  // URL 쿼리라 누구나 값을 바꿔 넣을 수 있어서, 확인 없이 업데이트하면
  // 다른 사람의 pending 주문을 실패 처리할 수 있었다.
  if (orderId && user) {
    const supabase = createAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, profile_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (order && order.profile_id === user.id) {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order.id)
        .eq("status", "pending");
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">결제가 취소되었습니다</h1>
      <p className="text-sm text-zinc-500">
        {message ?? "결제 진행 중 문제가 발생했습니다. 다시 시도해주세요."}
      </p>
      <Link
        href="/courses/high"
        className="mt-4 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        강좌 목록으로 돌아가기
      </Link>
    </section>
  );
}
