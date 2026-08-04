import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { syncLessonStatuses } from "@/lib/mux";

interface Instructor {
  name: string;
  photo_url: string | null;
  bio: string | null;
}

interface Course {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
  overview: string | null;
  thumbnail_url: string | null;
  instructors: Instructor | null;
}

interface Lesson {
  id: string;
  order_no: number;
  title: string;
  description: string | null;
  status: string;
  mux_asset_id: string | null;
}

export default async function CourseClassroomPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, subject, title, teacher_name, overview, thumbnail_url, instructors(name, photo_url, bio)",
    )
    .eq("id", courseId)
    .maybeSingle()
    .returns<Course>();

  if (!course) {
    notFound();
  }

  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, order_no, title, description, status, mux_asset_id")
    .eq("course_id", courseId)
    .order("order_no", { ascending: true })
    .returns<Lesson[]>();

  if (allLessons?.length) {
    await syncLessonStatuses(supabase, allLessons);
  }

  const lessons = allLessons?.filter((lesson) => lesson.status === "ready");

  const instructor = course.instructors;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
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
        <h1 className="mt-1 text-3xl font-bold text-zinc-900 sm:text-4xl">
          {course.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {course.teacher_name} 선생님
        </p>
      </div>

      {(course.thumbnail_url || course.overview) && (
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:flex-row">
          {course.thumbnail_url && (
            <div className="aspect-video w-full shrink-0 overflow-hidden rounded-md bg-zinc-100 sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          {course.overview && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
              {course.overview}
            </p>
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-zinc-900">커리큘럼</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {(!lessons || lessons.length === 0) && (
            <p className="px-6 py-8 text-center text-sm text-zinc-400">
              아직 업로드된 영상이 없습니다.
            </p>
          )}
          <ul className="divide-y divide-zinc-100">
            {lessons?.map((lesson) => (
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
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    시청하기 →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {instructor && (
        <div>
          <h2 className="text-lg font-bold text-zinc-900">강사 소개</h2>
          <div className="mt-3 flex gap-4 rounded-lg border border-zinc-200 bg-white p-6">
            {instructor.photo_url && (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={instructor.photo_url}
                  alt={instructor.name}
                  className="h-full w-full object-cover"
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
