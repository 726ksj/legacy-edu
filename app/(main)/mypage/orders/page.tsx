import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";

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
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Orders
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          주문내역
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          결제한 강좌와 결제 상태를 확인하세요.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {(orders ?? []).map((order) => {
          const titles = order.order_items
            .map((item) => item.courses?.title)
            .filter((title): title is string => Boolean(title));

          return (
            <div
              key={order.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  {formatDateTime(order.created_at)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_STYLE[order.status] ?? "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {titles.length > 0 ? (
                  titles.map((title, i) => (
                    <p key={i} className="text-sm text-zinc-700">
                      {title}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-zinc-700">강좌 정보 없음</p>
                )}
              </div>
              <p className="mt-3 text-right text-base font-bold text-zinc-900">
                {order.amount.toLocaleString("ko-KR")}원
              </p>
            </div>
          );
        })}
        {(orders ?? []).length === 0 && (
          <p className="py-16 text-center text-sm text-zinc-400">
            주문 내역이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
