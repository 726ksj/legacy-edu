import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  profile_id: string;
  enrolled_at: string;
  profiles: { name: string; username: string } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();

  const [{ data: course }, { data: enrollments }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, subject, title, teacher_name")
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
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/chat"
        className="mb-2 text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 채팅 모니터링
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900">
        [{course.subject}] {course.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        {course.teacher_name} 선생님 강좌의 학생별 채팅방입니다.
      </p>

      <div className="mt-6 max-w-2xl">
        {(!enrollments || enrollments.length === 0) && (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-400">
            수강 중인 학생이 없습니다.
          </p>
        )}
        {enrollments && enrollments.length > 0 && (
          <ul className="flex flex-col gap-3">
            {enrollments.map((enrollment) => (
              <li key={enrollment.profile_id}>
                <Link
                  href={`/admin/chat/${courseId}/${enrollment.profile_id}`}
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
                  <span className="text-sm text-zinc-400">채팅방 보기 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
