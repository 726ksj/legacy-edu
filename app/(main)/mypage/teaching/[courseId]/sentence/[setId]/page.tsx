import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { formatDate } from "@/lib/formatDateTime";

export const dynamic = "force-dynamic";

interface QuestionRow {
  id: string;
  order_no: number;
  intro: string;
  sentences: string[];
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string; setId: string }>;
}) {
  const { courseId, setId } = await params;

  // 관리자 또는 이 강좌에 배정된 강사만 들어올 수 있다.
  try {
    await requireCourseManager(courseId);
  } catch {
    notFound();
  }

  const supabase = createAdminClient();
  const [{ data: sentenceSet }, { data: questions }] = await Promise.all([
    supabase
      .from("sentence_sets")
      .select("id, title, week, is_hidden, created_at")
      .eq("id", setId)
      .eq("course_id", courseId)
      .maybeSingle(),
    supabase
      .from("sentence_questions")
      .select("id, order_no, intro, sentences")
      .eq("sentence_set_id", setId)
      .order("order_no", { ascending: true })
      .returns<QuestionRow[]>(),
  ]);

  if (!sentenceSet) {
    notFound();
  }

  const weekLabel = sentenceSet.week !== null ? `${sentenceSet.week}주차` : "주차 미지정";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <div>
        <Link
          href={`/mypage/teaching/${courseId}/week/${sentenceSet.week ?? "none"}`}
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← {weekLabel}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">{sentenceSet.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {weekLabel} · 문제 {questions?.length ?? 0}개 · {formatDate(sentenceSet.created_at)} 등록
          {sentenceSet.is_hidden ? " · 비공개" : ""}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          아래는 정답 순서입니다. 학생에게는 서버가 문장을 섞어 (A)(B)(C)…로 보여줍니다. 내용을 고치려면 엑셀을 수정해 새 세트로 다시 업로드해주세요.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {questions?.map((question) => (
          <li key={question.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">
                {question.order_no}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900">
                  {question.intro}
                </p>
                {question.sentences.map((part, index) => (
                  <p key={index} className="text-sm text-zinc-700">
                    <span className="mr-2 text-xs font-semibold text-brand-dark">
                      {index + 1}번째
                    </span>
                    {part}
                  </p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
