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
