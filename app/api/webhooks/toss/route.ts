import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTossPaymentByOrderId } from "@/lib/toss";
import { fulfillPaidOrder } from "@/lib/orderFulfillment";

export const dynamic = "force-dynamic";

// 결제 성공 리다이렉트는 사용자의 브라우저가 도착해야만 실행된다. 결제는
// 끝났는데 리다이렉트 전에 브라우저가 닫히거나 네트워크가 끊기면 주문이
// pending에 영구히 방치될 수 있어서, 토스 웹훅을 그 안전망으로 쓴다.
//
// 웹훅 payload에 담긴 상태값은 신뢰하지 않는다 — orderId만 꺼내서 우리
// 시크릿 키로 토스에 직접 재조회한 뒤, 그 응답만 근거로 반영한다. 이렇게
// 하면 위조된 웹훅 요청이 와도 실제 결제 상태 이상은 아무것도 못 한다.
export async function POST(request: Request) {
  let body: { data?: { orderId?: string } };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const orderId = body.data?.orderId;
  if (!orderId) {
    return Response.json({ ok: true });
  }

  let payment;
  try {
    payment = await getTossPaymentByOrderId(orderId);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "toss-webhook" },
      extra: { orderId },
    });
    return Response.json({ error: "lookup failed" }, { status: 502 });
  }

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, profile_id, status, amount")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order) {
    return Response.json({ ok: true });
  }

  if (payment.status === "DONE" && order.status === "pending") {
    if (payment.totalAmount !== order.amount) {
      Sentry.captureException(
        new Error(`webhook amount mismatch for order ${orderId}`),
        { tags: { area: "toss-webhook" }, extra: { orderId, payment, order } },
      );
      return Response.json({ ok: true });
    }

    await fulfillPaidOrder({
      orderDbId: order.id,
      profileId: order.profile_id,
      paymentKey: payment.paymentKey,
    });
  } else if (
    (payment.status === "CANCELED" || payment.status === "PARTIAL_CANCELED") &&
    order.status === "paid"
  ) {
    // 관리자 환불 버튼이 아니라 토스 대시보드에서 직접 취소한 경우를
    // 대비한 안전망. 이미 refundOrder가 처리했다면 status가 paid가
    // 아니므로 이 분기는 타지 않는다.
    await supabase
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", order.id)
      .eq("status", "paid");
  } else if (
    (payment.status === "EXPIRED" || payment.status === "ABORTED") &&
    order.status === "pending"
  ) {
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id)
      .eq("status", "pending");
  }

  return Response.json({ ok: true });
}
