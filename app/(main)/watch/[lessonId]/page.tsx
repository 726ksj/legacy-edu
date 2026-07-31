import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signPlaybackToken, signThumbnailToken } from "@/lib/mux";
import VideoPlayer from "./VideoPlayer";
import QnaSection from "./QnaSection";

interface LessonRow {
  id: string;
  order_no: number;
  title: string;
  status: string;
  mux_playback_id: string | null;
  course_id: string;
  courses: { subject: string; title: string; teacher_name: string } | null;
}

interface SiblingLesson {
  id: string;
  order_no: number;
  title: string;
  mux_playback_id: string | null;
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
      "id, order_no, title, status, mux_playback_id, course_id, courses(subject, title, teacher_name)",
    )
    .eq("id", lessonId)
    .maybeSingle()
    .returns<LessonRow>();

  if (!lesson) {
    notFound();
  }

  const course = lesson.courses;

  const { data: siblingLessons } = await supabase
    .from("lessons")
    .select("id, order_no, title, mux_playback_id")
    .eq("course_id", lesson.course_id)
    .eq("status", "ready")
    .order("order_no", { ascending: true })
    .returns<SiblingLesson[]>();

  const upNext = await Promise.all(
    (siblingLessons ?? []).map(async (sibling) => ({
      ...sibling,
      thumbnailUrl: sibling.mux_playback_id
        ? `https://image.mux.com/${sibling.mux_playback_id}/thumbnail.jpg?width=320&token=${await signThumbnailToken(sibling.mux_playback_id)}`
        : null,
    })),
  );

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, content, answer, created_at")
    .eq("lesson_id", lessonId)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const questions = (questionRows ?? []).map((question) => ({
    id: question.id,
    content: question.content,
    answer: question.answer,
    createdAt: new Date(question.created_at).toLocaleString("ko-KR"),
  }));

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-4">
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

        <QnaSection lessonId={lesson.id} questions={questions} />
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0">
        <p className="text-sm font-semibold text-zinc-700">차시 목록</p>
        <ul className="flex flex-col gap-2">
          {upNext.map((sibling) => (
            <li key={sibling.id}>
              <Link
                href={`/watch/${sibling.id}`}
                className={`flex gap-3 rounded-md p-2 text-sm hover:bg-zinc-50 ${
                  sibling.id === lesson.id ? "bg-brand-light" : ""
                }`}
              >
                <div className="aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-zinc-200">
                  {sibling.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sibling.thumbnailUrl}
                      alt={sibling.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span
                    className={
                      sibling.id === lesson.id
                        ? "font-semibold text-brand-dark"
                        : "text-zinc-700"
                    }
                  >
                    {sibling.order_no}강
                  </span>
                  <span className="line-clamp-2 text-xs text-zinc-500">
                    {sibling.title}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
