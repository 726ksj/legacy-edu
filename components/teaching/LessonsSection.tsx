import { createAdminClient } from "@/lib/supabase/admin";
import { syncLessonStatuses } from "@/lib/mux";
import UploadLessonForm from "@/app/admin/courses/[courseId]/lessons/UploadLessonForm";
import LessonRow from "@/app/admin/courses/[courseId]/lessons/LessonRow";
import { deleteLesson } from "@/app/admin/courses/[courseId]/lessons/actions";
import type { AudienceStudent } from "@/app/admin/courses/[courseId]/lessons/LessonAudiencePicker";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  preparing: { label: "처리 중", className: "bg-amber-100 text-amber-700" },
  ready: { label: "재생 가능", className: "bg-brand-light text-brand-dark" },
  errored: { label: "처리 실패", className: "bg-red-100 text-red-600" },
};

interface EnrolledProfileRow {
  profiles: AudienceStudent | null;
}

// 한 주차(또는 주차 미지정 null)의 영상 업로드 + 목록. 순서(order_no)는
// 강좌 전체 기준이라, 업로드 폼/수정 폼에는 강좌 전체 영상 수를 넘긴다.
export default async function LessonsSection({
  courseId,
  week,
  totalWeeks,
}: {
  courseId: string;
  // 숫자 = 그 주차, null = 주차 미지정, "all" = 주차 구분 없이 전체.
  week: number | null | "all";
  totalWeeks: number | null;
}) {
  const supabase = createAdminClient();

  const { data: allLessons, error: lessonsError } = await supabase
    .from("lessons")
    .select(
      "id, order_no, title, mux_asset_id, status, created_at, description, visibility, video_filename, is_hidden, week",
    )
    .eq("course_id", courseId)
    .order("order_no", { ascending: true });

  const totalCount = allLessons?.length ?? 0;
  const lessons = (allLessons ?? []).filter(
    (lesson) => week === "all" || (lesson.week ?? null) === week,
  );

  if (lessons.length) {
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

  const lessonIds = lessons.map((lesson) => lesson.id);
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
    <div>
      {lessonsError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          영상 목록을 불러오지 못했습니다: {lessonsError.message}
        </p>
      )}
      <UploadLessonForm
        courseId={courseId}
        students={students}
        nextOrderNo={totalCount + 1}
        defaultWeek={week === "all" ? null : week}
        totalWeeks={totalWeeks}
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[880px] table-fixed text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="w-16 px-4 py-3">순서</th>
              <th className="px-4 py-3">제목</th>
              <th className="w-52 px-4 py-3">상태</th>
              <th className="w-40 px-4 py-3">업로드일</th>
              <th className="w-60 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lessons.map((lesson) => {
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
                  maxOrderNo={totalCount}
                  totalWeeks={totalWeeks}
                />
              );
            })}
            {lessons.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  등록된 영상이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
