import { createAdminClient } from "@/lib/supabase/admin";
import RefundButton from "./RefundButton";

export const dynamic = "force-dynamic";

interface AdminOrderRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  profiles: { name: string; username: string } | null;
  order_items: { courses: { title: string } | null }[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  failed: "결제 실패",
  cancelled: "취소됨",
  refunded: "환불됨",
};

export default async function AdminOrdersPage() {
  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, amount, status, created_at, paid_at, profiles(name, username), order_items(courses(title))",
    )
    .order("created_at", { ascending: false })
    .returns<AdminOrderRow[]>();

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">주문/결제 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        학생들의 결제 내역을 확인하고 환불을 처리하는 페이지입니다.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">학생</th>
              <th className="px-4 py-3">강좌</th>
              <th className="px-4 py-3">금액</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">결제일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(orders ?? []).map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 text-zinc-700">
                  {order.profiles?.name ?? "-"}
                  <span className="ml-1 text-xs text-zinc-400">
                    ({order.profiles?.username ?? "-"})
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {order.order_items
                    .map((item) => item.courses?.title)
                    .filter(Boolean)
                    .join(", ") || "-"}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {order.amount.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {STATUS_LABEL[order.status] ?? order.status}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {order.paid_at
                    ? new Date(order.paid_at).toLocaleString("ko-KR")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {order.status === "paid" && (
                    <RefundButton orderId={order.id} />
                  )}
                </td>
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  주문 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
