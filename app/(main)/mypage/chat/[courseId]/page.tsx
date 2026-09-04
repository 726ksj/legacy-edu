import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseGradeManager } from "@/lib/teachers";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  profile_id: string;
  enrolled_at: string;
  profiles: { name: string; username: string } | null;
}

export default async function ChatCourseStudentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  try {
    await requireCourseGradeManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();
  const [{ data: course }, { data: enrollments }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, subject, title")
      .eq("id", courseId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select("profile_id, enrolled_at, profiles(name, username)")
      .eq("course_id", courseId)
      .order("enrolled_at", { ascending: false })
      .returns<EnrollmentRow[]>(),
  ]);

  if (!course) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <Link
          href="/mypage/chat"
          className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
        >
          ← 채팅
        </Link>
        <p className="text-xs font-semibold text-brand-dark">
          {course.subject}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {course.title}
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
      </div>

      {(!enrollments || enrollments.length === 0) && (
        <p className="text-sm text-zinc-500">수강 중인 학생이 없습니다.</p>
      )}

      {enrollments && enrollments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {enrollments.map((enrollment) => (
            <li key={enrollment.profile_id}>
              <Link
                href={`/mypage/chat/${courseId}/${enrollment.profile_id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {enrollment.profiles?.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {enrollment.profiles?.username}
                  </p>
                </div>
                <span className="text-sm text-zinc-400">채팅방 열기 →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
