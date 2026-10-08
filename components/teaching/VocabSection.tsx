import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import UploadVocabSetForm from "@/app/admin/vocabulary/[courseId]/UploadVocabSetForm";
import DeleteVocabSetButton from "@/app/admin/vocabulary/[courseId]/DeleteVocabSetButton";
import { deleteVocabSet } from "@/app/admin/vocabulary/[courseId]/actions";
import VocabSetWeekSelect from "./VocabSetWeekSelect";

interface VocabSetAssignmentRow {
  vocab_sets: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    week: number | null;
  } | null;
}

// 한 주차(또는 주차 미지정 null)의 단어(VOCA) 업로드 + 단어장 목록.
export default async function VocabSection({
  courseId,
  week,
}: {
  courseId: string;
  week: number | null;
}) {
  const supabase = createAdminClient();

  const { data: assignmentRows } = await supabase
    .from("vocab_assignments")
    .select("vocab_sets(id, title, description, created_at, week)")
    .eq("course_id", courseId)
    .order("assigned_at", { ascending: false })
    .returns<VocabSetAssignmentRow[]>();

  const vocabSets = (assignmentRows ?? [])
    .map((row) => row.vocab_sets)
    .filter((set): set is NonNullable<typeof set> => set !== null)
    .filter((set) => (set.week ?? null) === week);

  const vocabSetIds = vocabSets.map((set) => set.id);
  const { data: wordRows } = vocabSetIds.length
    ? await supabase
        .from("vocab_words")
        .select("vocab_set_id")
        .in("vocab_set_id", vocabSetIds)
    : { data: [] as { vocab_set_id: string }[] };

  const wordCountBySet = new Map<string, number>();
  for (const row of wordRows ?? []) {
    wordCountBySet.set(
      row.vocab_set_id,
      (wordCountBySet.get(row.vocab_set_id) ?? 0) + 1,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        업로드한 단어장은 이 강좌의 수강생 전체에게 자동으로 배정됩니다.
      </p>
      <UploadVocabSetForm courseId={courseId} defaultWeek={week} />

      <div className="flex flex-col gap-3">
        {vocabSets.map((set) => (
          <div
            key={set.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-zinc-900">{set.title}</p>
              {set.description && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  {set.description}
                </p>
              )}
              <p className="mt-2 text-xs text-zinc-500">
                {wordCountBySet.get(set.id) ?? 0}개 ·{" "}
                {formatDateTime(set.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {week === null && (
                <VocabSetWeekSelect vocabSetId={set.id} courseId={courseId} />
              )}
              <DeleteVocabSetButton
                action={deleteVocabSet.bind(null, set.id, courseId)}
              />
            </div>
          </div>
        ))}
        {vocabSets.length === 0 && (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
            등록된 단어장이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
