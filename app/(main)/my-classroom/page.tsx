import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";

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
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, courses(id, subject, title, teacher_name)")
    .eq("profile_id", user.id)
    .returns<Enrollment[]>();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          My Classroom
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          나의 강의실
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
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
            <div
              key={course.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-5 sm:p-6"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-dark">
                  {course.subject}
                </p>
                <h2 className="mt-1 text-base font-bold text-zinc-900 sm:text-lg">
                  {course.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {course.teacher_name} 선생님
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Link
                  href={`/my-classroom/${course.id}`}
                  className="flex items-center justify-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:border-brand hover:text-brand-dark"
                >
                  차시 목록 보기
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/my-classroom/${course.id}/chat`}
                  className="flex items-center justify-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  채팅방 바로가기
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
