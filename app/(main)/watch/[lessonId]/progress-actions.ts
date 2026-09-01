"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canWatchLesson, type LessonVisibility } from "@/lib/enrollments";

// 끝까지 다 안 봐도(아웃트로 스킵 등) 완료로 쳐주기 위한 기준.
const COMPLETION_THRESHOLD_PERCENT = 90;

export async function saveLessonProgress(
  lessonId: string,
  watchedSeconds: number,
  durationSeconds: number,
) {
  if (
    !Number.isFinite(watchedSeconds) ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id, visibility")
    .eq("id", lessonId)
    .maybeSingle<{ id: string; course_id: string; visibility: LessonVisibility }>();

  if (!lesson) return;
  if (!(await canWatchLesson(supabase, user.id, lesson))) return;

  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("watched_seconds, completed_at")
    .eq("profile_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // 되감아 다시 봐도 진도가 줄어들지 않도록, 가장 멀리 도달한 지점만
  // 갱신한다.
  const nextWatchedSeconds = Math.max(
    existing?.watched_seconds ?? 0,
    watchedSeconds,
  );
  const percent = Math.min(
    100,
    Math.round((nextWatchedSeconds / durationSeconds) * 100),
  );
  // 한 번 완료로 인정되면, 이후 되감아서 다시 보더라도 완료 상태를 잃지
  // 않는다.
  const completedAt =
    existing?.completed_at ??
    (percent >= COMPLETION_THRESHOLD_PERCENT ? new Date().toISOString() : null);

  await supabase.from("lesson_progress").upsert(
    {
      profile_id: user.id,
      lesson_id: lessonId,
      watched_seconds: nextWatchedSeconds,
      duration_seconds: durationSeconds,
      percent,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,lesson_id" },
  );

  revalidatePath(`/my-classroom/${lesson.course_id}`);
}
