import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import { buildThreads, countUnreadFromStudent } from "@/lib/questionThreads";

export const dynamic = "force-dynamic";

interface QuestionRow {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  lesson_id: string;
  profile_id: string;
  question_read_at: string | null;
  answer_read_at: string | null;
  lessons: { course_id: string } | null;
}

export default async function Page() {
  const supabase = createAdminClient();
  const [{ data: courses, error }, { data: rows }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, subject, title, teacher_name, school, created_at")
      .order("created_at", { ascending: false }),
    // 강좌 목록에서 바로 "어느 강좌에 새 질문이 있는지" 보여주기 위해,
    // questions는 course_id가 없으니 lessons를 거쳐 강좌별로 집계한다.
    // "학생이 남긴 메시지 중 스태프가 아직 안 읽은 것"만 세야 해서(스태프
    // 본인이 쓴 답변은 제외), 스레드 단위로 묶은 뒤 계산한다.
    supabase
      .from("questions")
      .select(
        "id, parent_id, content, created_at, lesson_id, profile_id, question_read_at, answer_read_at, lessons(course_id)",
      )
      .returns<QuestionRow[]>(),
  ]);

  const threads = buildThreads(rows ?? []);
  const lessonToCourse = new Map(
    (rows ?? []).map((row) => [row.lesson_id, row.lessons?.course_id]),
  );

  const unreadCountByCourse = new Map<string, number>();
  for (const thread of threads) {
    const unreadCount = countUnreadFromStudent(thread);
    if (unreadCount === 0) continue;
    const courseId = lessonToCourse.get(thread.lessonId);
    if (!courseId) continue;
    unreadCountByCourse.set(
      courseId,
      (unreadCountByCourse.get(courseId) ?? 0) + unreadCount,
    );
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">질의응답 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        강좌를 선택하면 그 강좌의 차시별로 학생들이 남긴 질문을 확인할 수
        있습니다.
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">강좌명</th>
              <th className="px-4 py-3">선생님</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">개설일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {courses?.map((row) => {
              const unreadCount = unreadCountByCourse.get(row.id) ?? 0;
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-zinc-700">{row.subject}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <span className="flex items-center gap-1.5">
                      {row.title}
                      {unreadCount > 0 && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                          title={`안 읽은 질문 ${unreadCount}개`}
                        />
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.teacher_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {row.school ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/notes/${row.id}`}
                      className="text-xs font-semibold text-brand-dark hover:underline"
                    >
                      질문 보기
                    </Link>
                  </td>
                </tr>
              );
            })}
            {courses?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  등록된 강좌가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
