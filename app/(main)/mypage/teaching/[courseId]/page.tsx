import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncLessonStatuses } from "@/lib/mux";
import { requireCourseManager } from "@/lib/teachers";
import UploadLessonForm from "@/app/admin/courses/[courseId]/lessons/UploadLessonForm";
import LessonRow from "@/app/admin/courses/[courseId]/lessons/LessonRow";
import { deleteLesson } from "@/app/admin/courses/[courseId]/lessons/actions";
import type { AudienceStudent } from "@/app/admin/courses/[courseId]/lessons/LessonAudiencePicker";
import CourseNoticeForm from "./CourseNoticeForm";
import CourseNoticeRow from "./CourseNoticeRow";
import { updateCourseNotice, deleteCourseNotice } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  preparing: { label: "처리 중", className: "bg-amber-100 text-amber-700" },
  ready: { label: "재생 가능", className: "bg-brand-light text-brand-dark" },
  errored: { label: "처리 실패", className: "bg-red-100 text-red-600" },
};

interface EnrolledProfileRow {
  profiles: AudienceStudent | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  // 관리자 또는 이 강좌에 배정된 강사만 들어올 수 있다. Server Action이
  // 아니라 페이지 자체 접근이라, 여기서도 별도로 확인해야 한다.
  try {
    await requireCourseManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, title")
    .eq("id", courseId)
    .maybeSingle();

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

  const { data: courseNotices } = await supabase
    .from("course_notices")
    .select("id, title, content, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div>
        <Link
          href="/mypage/teaching"
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← 내 강좌 관리
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">
          [{course.subject}] {course.title}
        </h1>
      </div>

      <div>
        <h2 className="text-lg font-bold text-zinc-900">영상 관리</h2>
        <div className="mt-3">
          <UploadLessonForm courseId={courseId} students={students} />
        </div>

        <div className="mt-4 overflow-visible rounded-lg border border-zinc-200 bg-white">
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

      <div>
        <h2 className="text-lg font-bold text-zinc-900">공지사항 관리</h2>
        <p className="mt-1 text-sm text-zinc-500">
          이 강좌를 수강 중인 학생들의 &quot;나의 강의실&quot; 화면에만
          보이는 공지입니다.
        </p>

        <div className="mt-3">
          <CourseNoticeForm courseId={courseId} />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {courseNotices?.map((notice) => (
            <CourseNoticeRow
              key={notice.id}
              notice={notice}
              onUpdate={updateCourseNotice.bind(null, notice.id, courseId)}
              onDelete={deleteCourseNotice.bind(null, notice.id, courseId)}
            />
          ))}
          {courseNotices?.length === 0 && (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
              등록된 강좌 공지가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
