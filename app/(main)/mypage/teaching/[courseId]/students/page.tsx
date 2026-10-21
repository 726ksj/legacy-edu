import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { getPaidProfileIds, isAdminUsername } from "@/lib/courseStudents";
import AddStudentsPanel, { type CandidateStudent } from "@/components/teaching/AddStudentsPanel";
import StudentRoster, { type RosterStudent } from "@/components/teaching/StudentRoster";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  id: string;
  enrolled_at: string;
  profiles: {
    id: string;
    name: string;
    username: string;
    school: string | null;
    grade: string | null;
  } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  // 관리자 또는 이 강좌에 배정된 강사만 들어올 수 있다.
  try {
    await requireCourseManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) {
    notFound();
  }

  const [{ data: enrollmentRows, error: enrollmentError }, { data: studentRows, error: studentError }, paid] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("id, enrolled_at, profiles(id, name, username, school, grade)")
        .eq("course_id", courseId)
        .order("enrolled_at", { ascending: false })
        .returns<EnrollmentRow[]>(),
      // 학생 계정만(강사·조교 제외). 관리자 계정은 아래에서 아이디로 뺀다.
      supabase
        .from("profiles")
        .select("id, name, username, school, grade")
        .eq("role", "student")
        .order("name", { ascending: true })
        .returns<CandidateStudent[]>(),
      getPaidProfileIds(supabase, courseId),
    ]);

  const roster: RosterStudent[] = (enrollmentRows ?? [])
    .filter((row): row is EnrollmentRow & { profiles: NonNullable<EnrollmentRow["profiles"]> } =>
      row.profiles !== null,
    )
    .map((row) => ({
      enrollmentId: row.id,
      id: row.profiles.id,
      name: row.profiles.name,
      username: row.profiles.username,
      school: row.profiles.school,
      grade: row.profiles.grade,
      enrolledAt: row.enrolled_at,
      paid: paid.has(row.profiles.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const enrolledIds = new Set(roster.map((student) => student.id));
  const candidates = (studentRows ?? []).filter(
    (student) => !enrolledIds.has(student.id) && !isAdminUsername(student.username),
  );

  const loadError = enrollmentError ?? studentError;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <div>
        <Link
          href={`/mypage/teaching/${courseId}`}
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← {course.title}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">수강생 관리</h1>
      </div>

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          일부 정보를 불러오지 못했습니다: {loadError.message}
        </p>
      )}

      <AddStudentsPanel courseId={courseId} candidates={candidates} />
      <StudentRoster courseId={courseId} students={roster} />
    </div>
  );
}
