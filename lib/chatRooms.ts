import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 방 생성 자체엔 권한 체크가 없다 - 호출부(학생 본인 화면은 수강 여부,
// 스태프 화면은 requireCourseGradeManager, 관리자 화면은 requireAdmin)에서
// 먼저 확인한 뒤에만 불러써야 한다.
export async function findOrCreateChatRoom(
  courseId: string,
  studentProfileId: string,
): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_profile_id", studentProfileId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("chat_rooms")
    .insert({ course_id: courseId, student_profile_id: studentProfileId })
    .select("id")
    .single();

  if (error) {
    // 동시에 두 요청이 같은 방을 만들려고 하면 unique(course_id,
    // student_profile_id) 제약에 걸리는데, 그럴 땐 먼저 만들어진 방을
    // 다시 조회해서 쓴다.
    const { data: raceWinner } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_profile_id", studentProfileId)
      .maybeSingle();
    if (raceWinner) return raceWinner.id;
    throw new Error(error.message);
  }

  return created.id;
}
