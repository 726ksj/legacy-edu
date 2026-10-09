import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { formatDate } from "@/lib/formatDateTime";

export const dynamic = "force-dynamic";

interface SentenceRow {
  id: string;
  order_no: number;
  english: string;
  korean: string;
  chunks: string[];
  key_phrases: string[];
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
  const [{ data: writingSet }, { data: sentences }] = await Promise.all([
    supabase
      .from("writing_sets")
      .select("id, title, week, is_hidden, created_at")
      .eq("id", setId)
      .eq("course_id", courseId)
      .maybeSingle(),
    supabase
      .from("writing_sentences")
      .select("id, order_no, english, korean, chunks, key_phrases")
      .eq("writing_set_id", setId)
      .order("order_no", { ascending: true })
      .returns<SentenceRow[]>(),
  ]);

  if (!writingSet) {
    notFound();
  }

  const weekLabel = writingSet.week !== null ? `${writingSet.week}주차` : "주차 미지정";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <div>
        <Link
          href={`/mypage/teaching/${courseId}/week/${writingSet.week ?? "none"}`}
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← {weekLabel}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">{writingSet.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {weekLabel} · 문장 {sentences?.length ?? 0}개 · {formatDate(writingSet.created_at)} 등록
          {writingSet.is_hidden ? " · 비공개" : ""}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          내용을 고치려면 엑셀을 수정해 새 세트로 다시 업로드해주세요. 진한 분홍색 배열 단위가
          핵심 어구입니다.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {sentences?.map((sentence) => (
          <li key={sentence.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">
                {sentence.order_no}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{sentence.english}</p>
                <p className="mt-0.5 text-sm text-zinc-500">{sentence.korean}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sentence.chunks.map((chunk, index) => (
                    <span
                      key={index}
                      className={
                        "rounded px-2 py-0.5 text-xs " +
                        (sentence.key_phrases.includes(chunk)
                          ? "bg-brand font-semibold text-white"
                          : "bg-zinc-100 text-zinc-700")
                      }
                    >
                      {chunk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
