"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelTossPayment } from "@/lib/toss";

export interface RefundState {
  error?: string;
  success?: boolean;
}

export async function refundOrder(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState always passes prevState as the trailing arg
  _prevState: RefundState,
): Promise<RefundState> {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, profile_id, status, payment_key")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { error: "주문을 찾을 수 없습니다." };
  }
  if (order.status !== "paid") {
    return { error: "결제 완료 상태의 주문만 환불할 수 있습니다." };
  }
  if (!order.payment_key) {
    return { error: "결제 정보가 없어 환불할 수 없습니다." };
  }

  try {
    await cancelTossPayment({
      paymentKey: order.payment_key,
      cancelReason: "관리자 환불 처리",
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "환불 처리에 실패했습니다.",
    };
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("course_id")
    .eq("order_id", order.id);

  const courseIds = (items ?? []).map((item) => item.course_id);

  await supabase.from("orders").update({ status: "refunded" }).eq("id", order.id);

  if (courseIds.length > 0) {
    await supabase
      .from("enrollments")
      .delete()
      .eq("profile_id", order.profile_id)
      .in("course_id", courseIds);
  }

  revalidatePath("/admin/orders");
  return { success: true };
}
