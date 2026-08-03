import { createAdminClient } from "@/lib/supabase/admin";
import AnswerForm from "./AnswerForm";

export const dynamic = "force-dynamic";

interface QuestionRow {
  id: string;
  content: string;
  answer: string | null;
  created_at: string;
  lessons: {
    order_no: number;
    title: string;
    course_id: string;
    courses: { subject: string; title: string } | null;
  } | null;
  profiles: { name: string; username: string } | null;
}

interface CourseGroup {
  subject: string;
  title: string;
  items: QuestionRow[];
}

export default async function Page() {
  const supabase = createAdminClient();

  const { data: questions, error } = await supabase
    .from("questions")
    .select(
      "id, content, answer, created_at, lessons(order_no, title, course_id, courses(subject, title)), profiles(name, username)",
    )
    .order("created_at", { ascending: false })
    .returns<QuestionRow[]>();

  const groups = new Map<string, CourseGroup>();
  for (const question of questions ?? []) {
    const course = question.lessons?.courses;
    const key = question.lessons?.course_id ?? "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        subject: course?.subject ?? "",
        title: course?.title ?? "알 수 없는 강좌",
        items: [],
      });
    }
    groups.get(key)!.items.push(question);
  }

  const unansweredCount = (questions ?? []).filter((q) => !q.answer).length;

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">Q&amp;A 답변 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        학생이 강좌별로 남긴 질문에 답변하는 페이지입니다.
        {unansweredCount > 0 && (
          <span className="ml-2 font-semibold text-brand-dark">
            미답변 {unansweredCount}건
          </span>
        )}
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {Array.from(groups.entries()).map(([courseId, group]) => (
          <div
            key={courseId}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-900">
                [{group.subject}] {group.title}
              </p>
              <span className="text-xs text-zinc-400">
                {group.items.length}건
              </span>
            </div>
            <div className="flex flex-col divide-y divide-zinc-100">
              {group.items.map((question) => (
                <div key={question.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-zinc-500">
                      {question.lessons?.order_no}강 · {question.lessons?.title}{" "}
                      · {question.profiles?.name ?? "-"} (
                      {question.profiles?.username ?? "-"})
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {new Date(question.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-900">
                    {question.content}
                  </p>
                  <AnswerForm
                    questionId={question.id}
                    existingAnswer={question.answer}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!questions || questions.length === 0) && (
          <p className="text-sm text-zinc-400">등록된 질문이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
