import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCourseManager } from "@/lib/teachers";
import { formatDate } from "@/lib/formatDateTime";

export const dynamic = "force-dynamic";

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

  // 이 강좌에 배정된 단어장인지 확인한다(다른 강좌 단어장 접근 차단).
  const { data: assignment } = await supabase
    .from("vocab_assignments")
    .select("id")
    .eq("vocab_set_id", setId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!assignment) {
    notFound();
  }

  const [{ data: vocabSet }, { data: words }] = await Promise.all([
    supabase
      .from("vocab_sets")
      .select("id, title, description, week, created_at")
      .eq("id", setId)
      .maybeSingle(),
    supabase
      .from("vocab_words")
      .select("id, word, meaning, example")
      .eq("vocab_set_id", setId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!vocabSet) {
    notFound();
  }

  const weekLabel =
    vocabSet.week !== null ? `${vocabSet.week}주차` : "주차 미지정";
  const backHref = `/mypage/teaching/${courseId}/week/${vocabSet.week ?? "none"}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <div>
        <Link
          href={backHref}
          className="text-sm font-semibold text-zinc-500 hover:text-brand-dark"
        >
          ← {weekLabel}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">
          {vocabSet.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {weekLabel} · 단어 {words?.length ?? 0}개 ·{" "}
          {formatDate(vocabSet.created_at)} 등록
          {vocabSet.description ? ` · ${vocabSet.description}` : ""}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          내용을 고치려면 엑셀을 수정해 새 단어장으로 다시 업로드해주세요.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="w-14 px-4 py-3">번호</th>
              <th className="w-1/4 px-4 py-3">단어</th>
              <th className="w-1/4 px-4 py-3">뜻</th>
              <th className="px-4 py-3">예시 문장</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {words?.map((word, index) => (
              <tr key={word.id}>
                <td className="px-4 py-3 text-zinc-400">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {word.word}
                </td>
                <td className="px-4 py-3 text-zinc-700">{word.meaning}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {word.example ?? "-"}
                </td>
              </tr>
            ))}
            {words?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  등록된 단어가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
