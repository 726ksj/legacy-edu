import type { SupabaseClient } from "@supabase/supabase-js";

// 이 강좌를 결제로 구매한 학생들(결제 완료 주문 기준). 이 학생들은 결제로 등록된
// 수강생이라 강사가 수강 권한을 직접 해지할 수 없고(환불 등 결제 처리와 얽혀 있음),
// 수강생 추가 후보에서도 이미 등록돼 있으니 자연스럽게 빠진다.
export async function getPaidProfileIds(
  supabase: SupabaseClient,
  courseId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("order_items")
    .select("orders!inner(profile_id, status)")
    .eq("course_id", courseId)
    .eq("orders.status", "paid")
    .returns<{ orders: { profile_id: string; status: string } | null }[]>();

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.orders) ids.add(row.orders.profile_id);
  }
  return ids;
}

// 관리자 계정도 profiles에는 학생(role = student)으로 들어 있어서 아이디로 따로 뺀다.
export function isAdminUsername(username: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME;
  return Boolean(adminUsername) && username === adminUsername;
}
