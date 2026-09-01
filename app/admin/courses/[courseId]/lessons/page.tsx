import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncLessonStatuses } from "@/lib/mux";
import UploadLessonForm from "./UploadLessonForm";
import LessonRow from "./LessonRow";
import { deleteLesson } from "./actions";
import type { AudienceStudent } from "./LessonAudiencePicker";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  preparing: { label: "처리 중", className: "bg-amber-100 text-amber-700" },
  ready: { label: "재생 가능", className: "bg-brand-light text-brand-dark" },
  errored: { label: "처리 실패", className: "bg-red-100 text-red-600" },
};

interface EnrolledProfileRow {
  profiles: AudienceStudent | null;
}

interface AssignedTeacherRow {
  profiles: { name: string } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();

  const [{ data: course }, { data: assignedTeachers }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, subject, title, teacher_name")
      .eq("id", courseId)
      .maybeSingle(),
    supabase
      .from("course_teachers")
      .select("profiles(name)")
      .eq("course_id", courseId)
      .eq("role", "teacher")
      .returns<AssignedTeacherRow[]>(),
  ]);

  if (!course) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, order_no, title, mux_asset_id, status, created_at, description, visibility",
    )
    .eq("course_id", courseId)
    .order("order_no", { ascending: true });

  if (lessons?.length) {
    await syncLessonStatuses(supabase, lessons);
  }

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("profiles(id, name, username, school, grade)")
    .eq("course_id", courseId)
    .returns<EnrolledProfileRow[]>();

  const students = (enrollmentRows ?? [])
    .map((row) => row.profiles)
    .filter((profile): profile is AudienceStudent => profile !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
  const { data: accessRows } = lessonIds.length
    ? await supabase
        .from("lesson_access")
        .select("lesson_id, profile_id")
        .in("lesson_id", lessonIds)
    : { data: [] as { lesson_id: string; profile_id: string }[] };

  const accessByLesson = new Map<string, string[]>();
  for (const row of accessRows ?? []) {
    const list = accessByLesson.get(row.lesson_id) ?? [];
    list.push(row.profile_id);
    accessByLesson.set(row.lesson_id, list);
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        [{course.subject}] {course.title} — 차시 관리
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        {course.teacher_name} 선생님 강좌의 영상을 업로드하고 관리합니다.
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        배정된 선생님 계정:{" "}
        {assignedTeachers && assignedTeachers.length > 0
          ? assignedTeachers.map((row) => row.profiles?.name).filter(Boolean).join(", ")
          : "없음"}
        {" · "}
        <Link
          href={`/mypage/teaching/${courseId}`}
          className="font-semibold text-brand-dark hover:underline"
        >
          강좌별 공지 관리 화면 열기
        </Link>
      </p>

      <div className="mt-6">
        <UploadLessonForm courseId={courseId} students={students} />
      </div>

      <div className="mt-6 overflow-visible rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">순서</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">업로드일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lessons?.map((lesson) => {
              const statusInfo =
                STATUS_LABEL[lesson.status] ?? STATUS_LABEL.preparing;
              return (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  statusInfo={statusInfo}
                  students={students}
                  initialSelectedIds={accessByLesson.get(lesson.id) ?? []}
                  deleteAction={deleteLesson.bind(null, lesson.id, courseId)}
                />
              );
            })}
            {lessons?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  등록된 차시가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
