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
  order_items: { price: number; courses: { title: string } | null }[];
}

// 결제가 실제로 이뤄진 주문(완료/이후 환불)만 주문내역에 남긴다.
// 결제하기를 누르고 끝까지 결제하지 않은 pending, 실패, 취소는 애초에
// "주문"이 성립한 게 아니므로 여기 노출하지 않는다.
const STATUS_LABEL: Record<string, string> = {
  paid: "결제 완료",
  refunded: "환불됨",
};

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-brand-light text-brand-dark",
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
      "id, amount, status, created_at, order_items(price, courses(title))",
    )
    .eq("profile_id", user.id)
    .in("status", ["paid", "refunded"])
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
          결제를 완료한 강좌를 확인하세요.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {(orders ?? []).map((order) => {
          const items = order.order_items.filter(
            (item): item is { price: number; courses: { title: string } } =>
              Boolean(item.courses),
          );

          return (
            <div key={order.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 px-0.5">
                <p className="text-sm font-semibold text-zinc-700">
                  {formatDateTime(order.created_at)} 주문
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_STYLE[order.status] ?? "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {items.length > 0 ? (
                  items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4"
                    >
                      <p className="text-sm font-medium text-zinc-900">
                        {item.courses.title}
                      </p>
                      <span className="shrink-0 text-sm font-semibold text-zinc-700">
                        {item.price.toLocaleString("ko-KR")}원
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <p className="text-sm text-zinc-500">강좌 정보 없음</p>
                  </div>
                )}
              </div>

              <p className="px-0.5 text-right text-sm font-bold text-zinc-900">
                합계 {order.amount.toLocaleString("ko-KR")}원
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
