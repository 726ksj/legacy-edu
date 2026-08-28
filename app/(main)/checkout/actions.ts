"use server";

import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PendingOrder {
  orderId: string;
  amount: number;
  orderName: string;
}

export async function createPendingOrder(
  courseIds: string[],
): Promise<PendingOrder> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  if (courseIds.length === 0) {
    throw new Error("선택된 강좌가 없습니다.");
  }

  const supabase = createAdminClient();

  // 결제창을 닫고 "결제하기"를 다시 누르는 식으로 pending 주문이 계속
  // 쌓이는 걸 막는다. 토스 결제창 자체도 대략 30분이면 만료되니, 1시간
  // 지난 pending은 이미 죽은 시도로 보고 정리한다. 사용자가 새로 결제를
  // 시도할 때마다 자연스럽게 청소되므로 별도 배치 작업이 필요 없다.
  await supabase
    .from("orders")
    .update({ status: "failed" })
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const uniqueCourseIds = [...new Set(courseIds)];
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("id, title, price")
    .in("id", uniqueCourseIds);

  // 요청한 강좌 ID 개수와 실제로 존재하는 강좌 개수가 다르면, 삭제됐거나
  // 존재하지 않는 ID가 섞여 들어온 것이므로 일부만 결제되게 두지 않고
  // 전체를 거부한다.
  if (courseError || !courses || courses.length !== uniqueCourseIds.length) {
    throw new Error("강좌 정보를 찾을 수 없습니다.");
  }

  const { data: existingEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("profile_id", user.id)
    .in("course_id", uniqueCourseIds);

  if (existingEnrollments && existingEnrollments.length > 0) {
    const enrolledIds = new Set(existingEnrollments.map((e) => e.course_id));
    const alreadyEnrolledTitles = courses
      .filter((course) => enrolledIds.has(course.id))
      .map((course) => course.title);
    throw new Error(
      `이미 수강 중인 강좌가 포함되어 있습니다: ${alreadyEnrolledTitles.join(", ")}`,
    );
  }

  const amount = courses.reduce((sum, course) => sum + course.price, 0);
  if (amount <= 0) {
    throw new Error("결제 금액이 올바르지 않습니다. 관리자에게 문의해주세요.");
  }

  const orderId = randomUUID();
  const orderName =
    courses.length === 1
      ? courses[0].title
      : `${courses[0].title} 외 ${courses.length - 1}건`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_id: orderId,
      profile_id: user.id,
      amount,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error("주문 생성에 실패했습니다.");
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    courses.map((course) => ({
      order_id: order.id,
      course_id: course.id,
      price: course.price,
    })),
  );

  if (itemsError) {
    throw new Error("주문 생성에 실패했습니다.");
  }

  return { orderId, amount, orderName };
}
