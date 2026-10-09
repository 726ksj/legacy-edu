import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchTotalWeeks(
  courseId: string,
): Promise<number | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("courses")
    .select("total_weeks")
    .eq("id", courseId)
    .maybeSingle();
  return (data?.total_weeks as number | null | undefined) ?? null;
}

// 서버 액션용: 주차를 지정했다면 이 강좌의 주차 범위 안인지 확인한다.
// 문제가 있으면 사용자에게 보여 줄 오류 문구를, 없으면 null을 반환한다.
export async function validateWeekForCourse(
  courseId: string,
  week: number | null,
): Promise<string | null> {
  if (week === null) return null;
  const totalWeeks = await fetchTotalWeeks(courseId);
  if (!totalWeeks) {
    return "이 강좌는 주차 구성을 사용하지 않습니다.";
  }
  if (week > totalWeeks) {
    return `이 강좌는 ${totalWeeks}주차까지 있습니다.`;
  }
  return null;
}
