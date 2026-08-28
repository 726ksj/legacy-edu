import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

// 토스에서 결제 완료(DONE)로 확인된 주문을 우리 DB에 반영한다.
// 결제 성공 리다이렉트 페이지와 웹훅(리다이렉트 도달 전에 브라우저가
// 닫힌 경우의 안전망) 양쪽에서 공유해서 쓴다. pending일 때만 갱신되는
// 조건부 UPDATE라 두 경로가 동시에 들어와도 한 번만 반영된다.
export async function fulfillPaidOrder({
  orderDbId,
  profileId,
  paymentKey,
}: {
  orderDbId: string;
  profileId: string;
  paymentKey: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: updated } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_key: paymentKey,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderDbId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!updated) return; // 이미 다른 경로(성공 페이지/웹훅)에서 처리됨

  const { data: items } = await supabase
    .from("order_items")
    .select("course_id")
    .eq("order_id", orderDbId);

  const courseIds = (items ?? []).map((item) => item.course_id);
  if (courseIds.length === 0) return;

  try {
    const { error: enrollError } = await supabase.from("enrollments").insert(
      courseIds.map((courseId) => ({
        profile_id: profileId,
        course_id: courseId,
      })),
    );

    // 23505 = 이미 등록된 강좌(unique violation) — 결제는 성공했으니 정상 처리
    if (enrollError && enrollError.code !== "23505") {
      throw new Error(enrollError.message);
    }

    await supabase
      .from("cart_items")
      .delete()
      .eq("profile_id", profileId)
      .in("course_id", courseIds);
  } catch (err) {
    // 결제는 이미 확정됐으니 주문 상태는 그대로 두고, 수강 등록 실패는
    // 놓치지 않도록 Sentry로 보고해 관리자가 수동으로 확인하게 한다.
    Sentry.captureException(err, {
      tags: { area: "order-fulfillment" },
      extra: { orderId: orderDbId, courseIds },
    });
  }
}
