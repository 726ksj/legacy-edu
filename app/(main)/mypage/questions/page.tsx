import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser, isAdmin } from "@/lib/supabase/server";
import { getStaffCourseIds } from "@/lib/teachers";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildThreads, countUnreadFromStudent } from "@/lib/questionThreads";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: string;
  subject: string;
  title: string;
}

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

export default async function QuestionsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage/questions")}`);
  }

  // 관리자는 강좌 배정이 없으니(모든 강좌를 /admin/notes에서 이미 관리할
  // 수 있음) 이 목록 화면 자체가 의미 없어 마이페이지로 돌려보낸다.
  if (isAdmin(user)) {
    redirect("/mypage");
  }

  const courseIds = await getStaffCourseIds(user.id);

  let courses: CourseRow[] = [];
  const unreadCountByCourse = new Map<string, number>();
  if (courseIds.length > 0) {
    const supabase = createAdminClient();
    // questions는 course_id가 없으니 lessons를 거쳐 담당 강좌별로 집계한다.
    // "학생이 남긴 메시지 중 스태프가 아직 안 읽은 것"만 세야 해서(스태프
    // 본인이 쓴 답변은 제외), 스레드 단위로 묶은 뒤 계산한다.
    const [{ data }, { data: rows }] = await Promise.all([
      supabase.from("courses").select("id, subject, title").in("id", courseIds),
      supabase
        .from("questions")
        .select(
          "id, parent_id, content, created_at, lesson_id, profile_id, question_read_at, answer_read_at, lessons!inner(course_id)",
        )
        .in("lessons.course_id", courseIds)
        .returns<QuestionRow[]>(),
    ]);
    courses = data ?? [];

    const threads = buildThreads(rows ?? []);
    const lessonToCourse = new Map(
      (rows ?? []).map((row) => [row.lesson_id, row.lessons?.course_id]),
    );
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
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Questions
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          질문 관리
        </h1>
        <div className="h-[3px] w-12 rounded-full bg-brand" />
        <p className="text-sm text-zinc-500">
          담당 강좌 수강생이 남긴 질문을 확인하고 답변하세요.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-zinc-500">배정된 강좌가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((course) => {
            const unreadCount = unreadCountByCourse.get(course.id) ?? 0;
            return (
              <li key={course.id}>
                <Link
                  href={`/mypage/questions/${course.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:border-brand"
                >
                  <div>
                    <p className="text-xs font-semibold text-brand-dark">
                      {course.subject}
                    </p>
                    <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-zinc-900">
                      {course.title}
                      {unreadCount > 0 && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                          title={`안 읽은 질문 ${unreadCount}개`}
                        />
                      )}
                    </h2>
                  </div>
                  <span className="text-sm text-zinc-400">질문 보기 →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
