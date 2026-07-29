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

      <div className="flex flex-col gap-3">
        {enrollments?.map((enrollment) => {
          const course = enrollment.courses;
          if (!course) return null;

          return (
            <Link
              key={course.id}
              href={`/my-classroom/${course.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:border-brand"
            >
              <div>
                <p className="text-xs font-semibold text-brand-dark">
                  {course.subject}
                </p>
                <h2 className="mt-1 text-lg font-bold text-zinc-900">
                  {course.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {course.teacher_name} 선생님
                </p>
              </div>
              <span className="text-sm text-zinc-400">차시 목록 보기 →</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
