import type { SupabaseClient } from "@supabase/supabase-js";

export type LessonVisibility = "all" | "include" | "exclude";

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
// 차시 목록 중 이 학생이 볼 수 없는 차시만 걸러낸다 (visibility가
// "include"인데 목록에 없거나, "exclude"인데 목록에 있는 경우). 목록
// 화면(커리큘럼, 차시 사이드바 등)에서 접근 불가능한 차시가 통째로 다
// 보이는 걸 막는 용도.
export async function filterWatchableLessons<
  T extends { id: string; visibility: LessonVisibility },
>(
  supabase: SupabaseClient,
  profileId: string,
  lessons: T[],
): Promise<T[]> {
  const relevantIds = lessons
    .filter((lesson) => lesson.visibility !== "all")
    .map((lesson) => lesson.id);

  if (relevantIds.length === 0) return lessons;

  const { data } = await supabase
    .from("lesson_access")
    .select("lesson_id")
    .eq("profile_id", profileId)
    .in("lesson_id", relevantIds);

  const listedIds = new Set((data ?? []).map((row) => row.lesson_id));

  return lessons.filter((lesson) => {
    if (lesson.visibility === "include") return listedIds.has(lesson.id);
    if (lesson.visibility === "exclude") return !listedIds.has(lesson.id);
    return true;
  });
}

export async function canWatchLesson(
  supabase: SupabaseClient,
  profileId: string,
  lesson: {
    id: string;
    course_id: string;
    visibility: LessonVisibility;
  },
) {
  const enrolled = await isEnrolled(supabase, profileId, lesson.course_id);
  if (!enrolled) return false;
  if (lesson.visibility === "all") return true;

  const { data } = await supabase
    .from("lesson_access")
    .select("id")
    .eq("lesson_id", lesson.id)
    .eq("profile_id", profileId)
    .maybeSingle();

  const isListed = Boolean(data);
  return lesson.visibility === "include" ? isListed : !isListed;
}
