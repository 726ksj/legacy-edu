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
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("id, title, price")
    .in("id", courseIds);

  if (courseError || !courses || courses.length === 0) {
    throw new Error("강좌 정보를 찾을 수 없습니다.");
  }

  const amount = courses.reduce((sum, course) => sum + course.price, 0);
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
