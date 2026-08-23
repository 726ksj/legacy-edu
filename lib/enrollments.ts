import type { SupabaseClient } from "@supabase/supabase-js";

export async function isEnrolled(
  supabase: SupabaseClient,
  profileId: string,
  courseId: string,
) {
  const { data } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("profile_id", profileId)
    .eq("course_id", courseId)
    .maybeSingle();

  return Boolean(data);
}

// 강좌 전체 등록 여부는 이미 호출부에서 확인했다고 가정하고, 그 강좌의
// 차시 목록 중 "일부 공개"인데 이 학생이 허용 목록에 없는 차시만 걸러낸다.
// 목록 화면(커리큘럼, 차시 사이드바 등)에서 접근 불가능한 차시가 통째로
// 다 보이는 걸 막는 용도.
export async function filterWatchableLessons<
  T extends { id: string; is_restricted: boolean },
>(
  supabase: SupabaseClient,
  profileId: string,
  lessons: T[],
): Promise<T[]> {
  const restrictedIds = lessons
    .filter((lesson) => lesson.is_restricted)
    .map((lesson) => lesson.id);

  if (restrictedIds.length === 0) return lessons;

  const { data } = await supabase
    .from("lesson_access")
    .select("lesson_id")
    .eq("profile_id", profileId)
    .in("lesson_id", restrictedIds);

  const allowedIds = new Set((data ?? []).map((row) => row.lesson_id));

  return lessons.filter(
    (lesson) => !lesson.is_restricted || allowedIds.has(lesson.id),
  );
}

export async function canWatchLesson(
  supabase: SupabaseClient,
  profileId: string,
  lesson: { id: string; course_id: string; is_restricted: boolean },
) {
  const enrolled = await isEnrolled(supabase, profileId, lesson.course_id);
  if (!enrolled) return false;
  if (!lesson.is_restricted) return true;

  const { data } = await supabase
    .from("lesson_access")
    .select("id")
    .eq("lesson_id", lesson.id)
    .eq("profile_id", profileId)
    .maybeSingle();

  return Boolean(data);
}
