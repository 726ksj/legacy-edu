import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser, isAdmin } from "@/lib/supabase/server";
import { getStaffCourseIds } from "@/lib/teachers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: string;
  subject: string;
  title: string;
}

export default async function GradingPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage/grading")}`);
  }

  // 관리자는 강좌 배정이 없으니(모든 강좌를 /admin/users에서 이미 관리할
  // 수 있음) 이 목록 화면 자체가 의미 없어 마이페이지로 돌려보낸다.
  if (isAdmin(user)) {
    redirect("/mypage");
  }

  const courseIds = await getStaffCourseIds(user.id);

  let courses: CourseRow[] = [];
  if (courseIds.length > 0) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("courses")
      .select("id, subject, title")
      .in("id", courseIds);
    courses = data ?? [];
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Grading
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          성적 관리
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          담당 강좌 수강생의 성적 리포트를 관리하세요.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-zinc-500">배정된 강좌가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/mypage/grading/${course.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:border-brand"
              >
                <div>
                  <p className="text-xs font-semibold text-brand-dark">
                    {course.subject}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-zinc-900">
                    {course.title}
                  </h2>
                </div>
                <span className="text-sm text-zinc-400">학생 목록 →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
