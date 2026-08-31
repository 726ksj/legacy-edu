import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser, isAdmin } from "@/lib/supabase/server";

export async function isAssignedTeacher(
  courseId: string,
  profileId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("course_teachers")
    .select("id")
    .eq("course_id", courseId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return Boolean(data);
}

export async function getTeacherCourseIds(
  profileId: string,
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("course_teachers")
    .select("course_id")
    .eq("profile_id", profileId);
  return (data ?? []).map((row) => row.course_id as string);
}

export async function isTeacherAccount(profileId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  return data?.role === "teacher";
}

// 강좌 관리 권한(영상 업로드, 강좌별 공지 작성)을 확인한다. 관리자는 모든
// 강좌에 대해 항상 통과하고, 그 외에는 해당 강좌에 배정된 선생님이어야
// 한다. Server Action은 페이지 렌더링을 거치지 않고 Next-Action 헤더로
// 직접 호출될 수 있으니, 페이지에서 이미 확인했더라도 액션 안에서 다시
// 확인해야 한다(requireAdmin과 동일한 이유).
export async function requireCourseManager(courseId: string) {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }
  if (isAdmin(user)) {
    return user;
  }
  if (await isAssignedTeacher(courseId, user.id)) {
    return user;
  }
  throw new Error("이 강좌를 관리할 권한이 없습니다.");
}
