"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
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
  await requireAdmin();
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

  // 이 시점에는 토스 취소가 이미 성공해서 실제로 환불이 됐다. 아래
  // 업데이트가 실패해도 "환불에 실패했습니다"라고 하면 안 되고, 돈은
  // 나갔으니 관리자가 직접 상태를 맞춰야 한다는 걸 알려줘야 한다.
  const { error: statusError } = await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", order.id);

  if (statusError) {
    return {
      error: `토스 환불은 완료됐지만 주문 상태 업데이트에 실패했습니다 (${statusError.message}). 이 주문은 수동으로 확인해주세요.`,
    };
  }

  if (courseIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("enrollments")
      .delete()
      .eq("profile_id", order.profile_id)
      .in("course_id", courseIds);

    if (deleteError) {
      revalidatePath("/admin/orders");
      return {
        error: `환불은 완료됐지만 수강 권한 회수에 실패했습니다 (${deleteError.message}). 이 학생의 수강 권한을 수동으로 확인해주세요.`,
      };
    }
  }

  revalidatePath("/admin/orders");
  return { success: true };
}
