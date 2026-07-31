import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteQuestion } from "./actions";
import DeleteQuestionButton from "@/components/qna/DeleteQuestionButton";

export const dynamic = "force-dynamic";

interface QuestionRow {
  id: string;
  content: string;
  answer: string | null;
  created_at: string;
  lesson_id: string;
  lessons: {
    order_no: number;
    title: string;
    course_id: string;
    courses: { subject: string; title: string } | null;
  } | null;
}

interface CourseGroup {
  subject: string;
  title: string;
  items: QuestionRow[];
}

export default async function MyQnaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: questions } = await supabase
    .from("questions")
    .select(
      "id, content, answer, created_at, lesson_id, lessons(order_no, title, course_id, courses(subject, title))",
    )
    .eq("profile_id", user.id)
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

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16 sm:px-6">
      <div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          /my-qna
        </span>
        <h1 className="mt-3 text-3xl font-bold text-zinc-900">나의 Q&amp;A</h1>
        <p className="mt-2 text-sm text-zinc-500">
          강좌별로 남긴 질문과 답변을 모아볼 수 있어요. 나와 선생님만 볼 수
          있어요.
        </p>
      </div>

      {(!questions || questions.length === 0) && (
        <p className="text-sm text-zinc-500">아직 등록한 질문이 없습니다.</p>
      )}

      <div className="flex flex-col gap-8">
        {Array.from(groups.entries()).map(([courseId, group]) => (
          <div key={courseId} className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-brand-dark">
              [{group.subject}] {group.title}
            </p>
            <div className="flex flex-col gap-3">
              {group.items.map((question) => (
                <div
                  key={question.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/watch/${question.lesson_id}`}
                      className="text-xs font-medium text-zinc-500 hover:text-brand-dark"
                    >
                      {question.lessons?.order_no}강 · {question.lessons?.title}
                    </Link>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {new Date(question.created_at).toLocaleDateString(
                        "ko-KR",
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <p className="text-sm text-zinc-900">
                      {question.content}
                    </p>
                    <DeleteQuestionButton
                      action={deleteQuestion.bind(null, question.id)}
                    />
                  </div>
                  {question.answer ? (
                    <div className="mt-3 rounded-md bg-brand-light p-3">
                      <p className="text-xs font-semibold text-brand-dark">
                        선생님 답변
                      </p>
                      <p className="mt-1 text-sm text-zinc-800">
                        {question.answer}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">
                      아직 답변이 등록되지 않았습니다.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
