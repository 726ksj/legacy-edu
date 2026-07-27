import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPlaybackToken } from "@/lib/mux";
import VideoPlayer from "./VideoPlayer";

interface LessonRow {
  id: string;
  order_no: number;
  title: string;
  status: string;
  mux_playback_id: string | null;
  courses: { subject: string; title: string; teacher_name: string } | null;
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, order_no, title, status, mux_playback_id, courses(subject, title, teacher_name)",
    )
    .eq("id", lessonId)
    .maybeSingle()
    .returns<LessonRow>();

  if (!lesson) {
    notFound();
  }

  const course = lesson.courses;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-16 sm:px-6">
      <div>
        {course && (
          <p className="text-xs font-semibold text-brand-dark">
            [{course.subject}] {course.title} · {course.teacher_name} 선생님
          </p>
        )}
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">
          {lesson.order_no}강 · {lesson.title}
        </h1>
      </div>

      {lesson.status === "ready" && lesson.mux_playback_id ? (
        <VideoPlayer
          playbackId={lesson.mux_playback_id}
          token={await signPlaybackToken(lesson.mux_playback_id)}
          title={lesson.title}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-zinc-100">
          <p className="text-sm text-zinc-500">
            {lesson.status === "errored"
              ? "영상 처리 중 문제가 발생했습니다. 관리자에게 문의해주세요."
              : "영상을 처리하고 있습니다. 잠시 후 다시 시도해주세요."}
          </p>
        </div>
      )}
    </section>
  );
}
