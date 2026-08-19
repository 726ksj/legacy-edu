import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}) {
  const { message, orderId } = await searchParams;

  if (orderId) {
    const supabase = createAdminClient();
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("order_id", orderId)
      .eq("status", "pending");
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
