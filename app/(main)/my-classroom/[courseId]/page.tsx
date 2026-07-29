import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Course {
  id: string;
  subject: string;
  title: string;
  teacher_name: string;
}

interface Lesson {
  id: string;
  order_no: number;
  title: string;
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
    .select("id, subject, title, teacher_name")
    .eq("id", courseId)
    .maybeSingle()
    .returns<Course>();

  if (!course) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, order_no, title")
    .eq("course_id", courseId)
    .eq("status", "ready")
    .order("order_no", { ascending: true })
    .returns<Lesson[]>();

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-24 sm:px-6">
      <div>
        <Link
          href="/my-classroom"
          className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          ← 나의 강의실
        </Link>
        <p className="mt-3 text-xs font-semibold text-brand-dark">
          {course.subject}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">
          {course.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {course.teacher_name} 선생님
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <ul className="divide-y divide-zinc-100">
          {lessons?.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/watch/${lesson.id}`}
                className="flex items-center justify-between px-6 py-4 text-sm text-zinc-700 hover:text-brand-dark"
              >
                <span>
                  {lesson.order_no}강 · {lesson.title}
                </span>
                <span className="text-xs text-zinc-400">시청하기 →</span>
              </Link>
            </li>
          ))}
          {lessons?.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-zinc-400">
              아직 업로드된 영상이 없습니다.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
