import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface OrderRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  order_items: { courses: { title: string } | null }[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  failed: "결제 실패",
  cancelled: "취소됨",
  refunded: "환불됨",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  paid: "bg-brand-light text-brand-dark",
  failed: "bg-red-50 text-red-600",
  cancelled: "bg-zinc-100 text-zinc-500",
  refunded: "bg-amber-50 text-amber-700",
};

export default async function OrdersPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage/orders")}`);
  }

  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, amount, status, created_at, order_items(courses(title))",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
        주문내역
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        결제한 강좌와 결제 상태를 확인하세요.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {(orders ?? []).map((order) => (
          <div
            key={order.id}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                {new Date(order.created_at).toLocaleString("ko-KR")}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  STATUS_STYLE[order.status] ?? "bg-zinc-100 text-zinc-600"
                }`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-700">
              {order.order_items
                .map((item) => item.courses?.title)
                .filter(Boolean)
                .join(", ") || "강좌 정보 없음"}
            </p>
            <p className="mt-2 text-right text-base font-bold text-zinc-900">
              {order.amount.toLocaleString("ko-KR")}원
            </p>
          </div>
        ))}
        {(orders ?? []).length === 0 && (
          <p className="py-16 text-center text-sm text-zinc-400">
            주문 내역이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
