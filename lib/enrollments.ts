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
