import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import UploadVocabSetForm from "@/app/admin/vocabulary/[courseId]/UploadVocabSetForm";
import DeleteVocabSetButton from "@/app/admin/vocabulary/[courseId]/DeleteVocabSetButton";
import { deleteVocabSet } from "@/app/admin/vocabulary/[courseId]/actions";
import Link from "next/link";
import VocabSetWeekSelect from "./VocabSetWeekSelect";
import VocabSetHideButton from "./VocabSetHideButton";

interface VocabSetAssignmentRow {
  vocab_sets: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    week: number | null;
    is_hidden: boolean;
  } | null;
}

// 한 주차(또는 주차 미지정 null)의 단어(VOCA) 업로드 + 단어장 목록.
export default async function VocabSection({
  courseId,
  week,
  totalWeeks,
}: {
  courseId: string;
  week: number | null;
  totalWeeks: number;
}) {
  const supabase = createAdminClient();

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("vocab_assignments")
    .select("vocab_sets(id, title, description, created_at, week, is_hidden)")
    .eq("course_id", courseId)
    .order("assigned_at", { ascending: false })
    .returns<VocabSetAssignmentRow[]>();

  const vocabSets = (assignmentRows ?? [])
    .map((row) => row.vocab_sets)
    .filter((set): set is NonNullable<typeof set> => set !== null)
    .filter((set) => (set.week ?? null) === week);

  const vocabSetIds = vocabSets.map((set) => set.id);
  const { data: wordRows, error: wordError } = vocabSetIds.length
    ? await supabase
        .from("vocab_words")
        .select("vocab_set_id")
        .in("vocab_set_id", vocabSetIds)
    : { data: [] as { vocab_set_id: string }[], error: null };

  const wordCountBySet = new Map<string, number>();
  for (const row of wordRows ?? []) {
    wordCountBySet.set(
      row.vocab_set_id,
      (wordCountBySet.get(row.vocab_set_id) ?? 0) + 1,
    );
  }

  // 조회가 실패했는데 빈 목록으로 보이면 "등록된 단어장이 없다"로 오해하니,
  // 오류를 그대로 보여준다.
  const loadError = assignmentError?.message ?? wordError?.message;

  return (
    <div className="flex flex-col gap-4">
      <UploadVocabSetForm
        courseId={courseId}
        defaultWeek={week}
        totalWeeks={totalWeeks}
      />

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          단어장 목록을 불러오지 못했습니다: {loadError}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="w-20 px-4 py-3">단어 수</th>
              <th className="w-40 px-4 py-3">등록일</th>
              {week === null && <th className="w-28 px-4 py-3">주차</th>}
              <th className="w-20 px-2 py-3 text-center">단어 보기</th>
              <th className="w-20 px-2 py-3 text-center">숨김</th>
              <th className="w-20 px-2 py-3 text-center">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {vocabSets.map((set) => (
              <tr key={set.id} className={set.is_hidden ? "bg-zinc-50" : ""}>
                <td className="px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                    {set.title}
                    {set.is_hidden && (
                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                        비공개
                      </span>
                    )}
                  </p>
                  {set.description && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {set.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {wordCountBySet.get(set.id) ?? 0}개
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {formatDateTime(set.created_at)}
                </td>
                {week === null && (
                  <td className="px-4 py-3">
                    <VocabSetWeekSelect
                      vocabSetId={set.id}
                      courseId={courseId}
                      totalWeeks={totalWeeks}
                    />
                  </td>
                )}
                <td className="px-2 py-3 text-center">
                  <Link
                    href={`/mypage/teaching/${courseId}/vocab/${set.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    단어 보기
                  </Link>
                </td>
                <td className="px-2 py-3 text-center">
                  <VocabSetHideButton
                    vocabSetId={set.id}
                    courseId={courseId}
                    hidden={set.is_hidden}
                  />
                </td>
                <td className="px-2 py-3 text-center">
                  <DeleteVocabSetButton
                    action={deleteVocabSet.bind(null, set.id, courseId)}
                  />
                </td>
              </tr>
            ))}
            {vocabSets.length === 0 && (
              <tr>
                <td
                  colSpan={week === null ? 7 : 6}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  {loadError ? "목록을 불러오지 못했습니다." : "등록된 단어장이 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
