import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/formatDateTime";
import { syncLessonStatuses } from "@/lib/mux";
import {
  isEnrolled,
  filterWatchableLessons,
  type LessonVisibility,
} from "@/lib/enrollments";

interface Instructor {
  name: string;
  photo_url: string | null;
  bio: string | null;
}

interface Course {
  id: string;
  subject: string;
  title: string;
  overview: string | null;
  instructors: Instructor | null;
}

interface Lesson {
  id: string;
  order_no: number;
  title: string;
  description: string | null;
  status: string;
  mux_asset_id: string | null;
  visibility: LessonVisibility;
}

interface CourseNotice {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default async function CourseClassroomPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  // 넷 다 courseId만 있으면 되고 서로 의존하지 않으니 병렬로 요청한다.
  const [enrolled, { data: course }, { data: allLessons }, { data: courseNotices }] =
    await Promise.all([
      isEnrolled(supabase, user.id, courseId),
      supabase
        .from("courses")
        .select(
          "id, subject, title, overview, instructors(name, photo_url, bio)",
        )
        .eq("id", courseId)
        .maybeSingle()
        .returns<Course>(),
      supabase
        .from("lessons")
        .select(
          "id, order_no, title, description, status, mux_asset_id, visibility",
        )
        .eq("course_id", courseId)
        .order("order_no", { ascending: true })
        .returns<Lesson[]>(),
      supabase
        .from("course_notices")
        .select("id, title, content, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .returns<CourseNotice[]>(),
    ]);

  if (!enrolled) {
    notFound();
  }

  if (!course) {
    notFound();
  }

  if (allLessons?.length) {
    await syncLessonStatuses(supabase, allLessons);
  }

  const readyLessons =
    allLessons?.filter((lesson) => lesson.status === "ready") ?? [];
  const lessons = await filterWatchableLessons(
    supabase,
    user.id,
    readyLessons,
  );

  const { data: progressRows } = lessons.length
    ? await supabase
        .from("lesson_progress")
        .select("lesson_id, percent, completed_at")
        .eq("profile_id", user.id)
        .in(
          "lesson_id",
          lessons.map((lesson) => lesson.id),
        )
    : { data: [] };

  const progressByLessonId = new Map(
    (progressRows ?? []).map((row) => [
      row.lesson_id as string,
      { percent: row.percent as number, completed: Boolean(row.completed_at) },
    ]),
  );
  const completedCount = Array.from(progressByLessonId.values()).filter(
    (p) => p.completed,
  ).length;

  const instructor = course.instructors;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-16">
      <div>
        <Link
          href="/my-classroom"
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark sm:text-base"
        >
          ← 나의 강의실
        </Link>
        <p className="mt-8 text-sm font-semibold text-brand-dark sm:mt-10 sm:text-base">
          {course.subject}
        </p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="min-w-0 text-3xl font-bold text-zinc-900 sm:text-4xl">
            {course.title}
          </h1>
          <Link
            href={`/my-classroom/${courseId}/chat`}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <MessageCircle className="h-4 w-4" />
            채팅방 바로가기
          </Link>
        </div>
        {course.overview && (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
            {course.overview}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-zinc-900">커리큘럼</h2>
          {lessons && lessons.length > 0 && (
            <span className="text-xs text-zinc-400">
              총 {lessons.length}개 차시 · {completedCount}개 완료
            </span>
          )}
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {(!lessons || lessons.length === 0) && (
            <p className="px-6 py-8 text-center text-sm text-zinc-400">
              아직 업로드된 영상이 없습니다.
            </p>
          )}
          <ul className="max-h-[26rem] divide-y divide-zinc-100 overflow-y-auto">
            {lessons?.map((lesson) => {
              const progress = progressByLessonId.get(lesson.id);
              return (
              <li key={lesson.id}>
                <Link
                  href={`/watch/${lesson.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-4 text-sm text-zinc-700 hover:text-brand-dark"
                >
                  <span>
                    <span className="font-medium">{lesson.title}</span>
                    {lesson.description && (
                      <span className="mt-0.5 block whitespace-pre-line text-xs text-zinc-500">
                        {lesson.description}
                      </span>
                    )}
                    {progress && (
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className="h-1 w-20 overflow-hidden rounded-full bg-zinc-200">
                          <span
                            className={`block h-full rounded-full ${
                              progress.completed ? "bg-brand" : "bg-zinc-400"
                            }`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {progress.completed ? "완료" : `${progress.percent}%`}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    시청하기 →
                  </span>
                </Link>
              </li>
              );
            })}
          </ul>
        </div>
      </div>

      {courseNotices && courseNotices.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-zinc-900">공지</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {courseNotices.map((notice) => (
              <li
                key={notice.id}
                className="rounded-lg border border-zinc-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-zinc-900">{notice.title}</p>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatDate(notice.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                  {notice.content}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {instructor && (
        <div>
          <h2 className="text-lg font-bold text-zinc-900">강사 소개</h2>
          <div className="mt-3 flex gap-4 rounded-lg border border-zinc-200 bg-white p-6">
            {instructor.photo_url && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                <Image
                  src={instructor.photo_url}
                  alt={instructor.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <p className="font-semibold text-zinc-900">{instructor.name}</p>
              {instructor.bio && (
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">
                  {instructor.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
