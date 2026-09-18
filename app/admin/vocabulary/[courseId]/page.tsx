import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import UploadVocabSetForm from "./UploadVocabSetForm";
import DeleteVocabSetButton from "./DeleteVocabSetButton";
import { deleteVocabSet } from "./actions";

export const dynamic = "force-dynamic";

interface VocabSetAssignmentRow {
  assigned_at: string;
  vocab_sets: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
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
    .select("id, subject, title, teacher_name")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const { data: assignmentRows } = await supabase
    .from("vocab_assignments")
    .select("assigned_at, vocab_sets(id, title, description, created_at)")
    .eq("course_id", courseId)
    .order("assigned_at", { ascending: false })
    .returns<VocabSetAssignmentRow[]>();

  const vocabSets = (assignmentRows ?? [])
    .map((row) => row.vocab_sets)
    .filter((set): set is NonNullable<typeof set> => set !== null);

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
        <UploadVocabSetForm courseId={courseId} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">단어 수</th>
              <th className="px-4 py-3">배정일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {vocabSets.map((set) => (
              <tr key={set.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{set.title}</p>
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
                <td className="px-4 py-3 text-right">
                  <DeleteVocabSetButton
                    action={deleteVocabSet.bind(null, set.id, courseId)}
                  />
                </td>
              </tr>
            ))}
            {vocabSets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
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
