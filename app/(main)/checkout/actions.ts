"use server";

import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PendingOrder {
  orderId: string;
  amount: number;
  orderName: string;
}

export async function createPendingOrder(courseId: string): Promise<PendingOrder> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const supabase = createAdminClient();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, price")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error("강좌 정보를 찾을 수 없습니다.");
  }

  const orderId = randomUUID();

  const { error } = await supabase.from("orders").insert({
    order_id: orderId,
    profile_id: user.id,
    course_id: course.id,
    amount: course.price,
    status: "pending",
  });

  if (error) {
    throw new Error("주문 생성에 실패했습니다.");
  }

  return { orderId, amount: course.price, orderName: course.title };
}
