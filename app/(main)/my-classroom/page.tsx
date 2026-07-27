import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Enrollment {
  course_id: string;
  courses: {
    id: string;
    subject: string;
    title: string;
    teacher_name: string;
  } | null;
}

interface Lesson {
  id: string;
  course_id: string;
  order_no: number;
  title: string;
}

export default async function MyClassroomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, courses(id, subject, title, teacher_name)")
    .eq("profile_id", user.id)
    .returns<Enrollment[]>();

  const courseIds = (enrollments ?? []).map((e) => e.course_id);

  const { data: lessons } = courseIds.length
    ? await supabase
        .from("lessons")
        .select("id, course_id, order_no, title")
        .in("course_id", courseIds)
        .eq("status", "ready")
        .order("order_no", { ascending: true })
        .returns<Lesson[]>()
    : { data: [] as Lesson[] };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-24 sm:px-6">
      <div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          /my-classroom
        </span>
        <h1 className="mt-3 text-3xl font-bold text-zinc-900">나의 강의실</h1>
      </div>

      {(!enrollments || enrollments.length === 0) && (
        <p className="text-sm text-zinc-500">
          아직 등록된 강좌가 없습니다. 상담 후 학원에서 수강 등록을 도와드릴게요.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {enrollments?.map((enrollment) => {
          const course = enrollment.courses;
          if (!course) return null;
          const courseLessons =
            lessons?.filter((l) => l.course_id === course.id) ?? [];

          return (
            <div
              key={course.id}
              className="rounded-lg border border-zinc-200 bg-white p-6"
            >
              <p className="text-xs font-semibold text-brand-dark">
                {course.subject}
              </p>
              <h2 className="mt-1 text-lg font-bold text-zinc-900">
                {course.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {course.teacher_name} 선생님
              </p>

              <ul className="mt-4 divide-y divide-zinc-100">
                {courseLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/watch/${lesson.id}`}
                      className="flex items-center justify-between py-3 text-sm text-zinc-700 hover:text-brand-dark"
                    >
                      <span>
                        {lesson.order_no}강 · {lesson.title}
                      </span>
                      <span className="text-xs text-zinc-400">시청하기 →</span>
                    </Link>
                  </li>
                ))}
                {courseLessons.length === 0 && (
                  <li className="py-3 text-sm text-zinc-400">
                    아직 업로드된 영상이 없습니다.
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
