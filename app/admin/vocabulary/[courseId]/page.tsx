import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import UploadVocabSetForm from "./UploadVocabSetForm";
import DeleteVocabSetButton from "./DeleteVocabSetButton";
import VocabSetHideButton from "@/components/teaching/VocabSetHideButton";
import { deleteVocabSet } from "./actions";

export const dynamic = "force-dynamic";

interface VocabSetAssignmentRow {
  assigned_at: string;
  vocab_sets: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    week: number | null;
    is_hidden: boolean;
  } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, subject, title, teacher_name, total_weeks")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("vocab_assignments")
    .select("assigned_at, vocab_sets(id, title, description, created_at, week, is_hidden)")
    .eq("course_id", courseId)
    .order("assigned_at", { ascending: false })
    .returns<VocabSetAssignmentRow[]>();

  const vocabSets = (assignmentRows ?? [])
    .map((row) => row.vocab_sets)
    .filter((set): set is NonNullable<typeof set> => set !== null);

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

  return (
    <div className="flex flex-1 flex-col p-8">
      <Link
        href="/admin/vocabulary"
        className="text-xs font-medium text-zinc-400 hover:text-brand-dark"
      >
        ← 단어장 관리
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">
        [{course.subject}] {course.title} — 단어장 관리
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        {course.teacher_name} 강사 강좌에 배정된 단어장입니다. 업로드하면 이
        강좌의 수강생 전체에게 자동으로 배정됩니다.
      </p>

      <div className="mt-6">
        {course.total_weeks ? (
          <UploadVocabSetForm
            courseId={courseId}
            totalWeeks={course.total_weeks}
          />
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            이 강좌는 커리큘럼 주차가 설정되지 않았습니다. 강좌 관리에서
            커리큘럼 주차를 먼저 설정해주세요.
          </p>
        )}
      </div>

      {(assignmentError || wordError) && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          단어장 목록을 불러오지 못했습니다:{" "}
          {assignmentError?.message ?? wordError?.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">주차</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">단어 수</th>
              <th className="px-4 py-3">배정일</th>
              <th className="w-20 px-2 py-3 text-center">단어 보기</th>
              <th className="w-20 px-2 py-3 text-center">숨김</th>
              <th className="w-20 px-2 py-3 text-center">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {vocabSets.map((set) => (
              <tr key={set.id} className={set.is_hidden ? "bg-zinc-50" : ""}>
                <td className="px-4 py-3 text-zinc-500">
                  {set.week ? `${set.week}주차` : "미지정"}
                </td>
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
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  등록된 단어장이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
