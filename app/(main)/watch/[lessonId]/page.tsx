import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  signPlaybackToken,
  signThumbnailToken,
  syncLessonStatuses,
} from "@/lib/mux";
import { isEnrolled } from "@/lib/enrollments";
import VideoPlayer from "./VideoPlayer";
import NoteSection from "./NoteSection";

interface LessonRow {
  id: string;
  order_no: number;
  title: string;
  status: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  course_id: string;
  courses: { subject: string; title: string; teacher_name: string } | null;
}

interface SiblingLesson {
  id: string;
  order_no: number;
  title: string;
  status: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, order_no, title, status, mux_asset_id, mux_playback_id, course_id, courses(subject, title, teacher_name)",
    )
    .eq("id", lessonId)
    .maybeSingle()
    .returns<LessonRow>();

  if (!lesson) {
    notFound();
  }

  // 셋 다 lesson.course_id/lessonId/user.id만 있으면 되고 서로 의존하지
  // 않으니 병렬로 요청한다.
  const [enrolled, { data: allSiblings }, { data: noteRows }] =
    await Promise.all([
      isEnrolled(supabase, user.id, lesson.course_id),
      supabase
        .from("lessons")
        .select("id, order_no, title, status, mux_asset_id, mux_playback_id")
        .eq("course_id", lesson.course_id)
        .order("order_no", { ascending: true })
        .returns<SiblingLesson[]>(),
      supabase
        .from("questions")
        .select("id, content, created_at")
        .eq("lesson_id", lessonId)
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!enrolled) {
    notFound();
  }

  await Promise.all([
    lesson.status === "preparing"
      ? syncLessonStatuses(supabase, [lesson])
      : Promise.resolve(),
    allSiblings?.length
      ? syncLessonStatuses(supabase, allSiblings)
      : Promise.resolve(),
  ]);

  const course = lesson.courses;

  const siblingLessons = allSiblings?.filter(
    (sibling) => sibling.status === "ready",
  );

  const upNext = await Promise.all(
    (siblingLessons ?? []).map(async (sibling) => ({
      ...sibling,
      thumbnailUrl: sibling.mux_playback_id
        ? `https://image.mux.com/${sibling.mux_playback_id}/thumbnail.jpg?width=320&token=${await signThumbnailToken(sibling.mux_playback_id)}`
        : null,
    })),
  );

  const notes = (noteRows ?? []).map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: new Date(note.created_at).toLocaleString("ko-KR"),
  }));

  const currentIndex = upNext.findIndex((sibling) => sibling.id === lesson.id);
  const prevLesson =
    currentIndex > 0 ? upNext[currentIndex - 1] : undefined;
  const nextLesson =
    currentIndex >= 0 ? upNext[currentIndex + 1] : undefined;
  const posterUrl =
    (currentIndex >= 0 ? upNext[currentIndex].thumbnailUrl : undefined) ??
    undefined;

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
            {lesson.title}
          </h1>
        </div>

        {lesson.status === "ready" && lesson.mux_playback_id ? (
          <VideoPlayer
            playbackId={lesson.mux_playback_id}
            token={await signPlaybackToken(lesson.mux_playback_id)}
            title={lesson.title}
            poster={posterUrl}
            prevLessonHref={prevLesson ? `/watch/${prevLesson.id}` : undefined}
            nextLessonHref={nextLesson ? `/watch/${nextLesson.id}` : undefined}
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

        <NoteSection lessonId={lesson.id} notes={notes} />
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
                <div className="flex min-w-0 flex-col justify-center">
                  <span
                    className={`line-clamp-2 text-sm ${
                      sibling.id === lesson.id
                        ? "font-semibold text-brand-dark"
                        : "text-zinc-700"
                    }`}
                  >
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
