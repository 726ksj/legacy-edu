import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";
import UploadWritingSetForm from "./UploadWritingSetForm";
import { WritingSetDeleteButton, WritingSetHideButton } from "./WritingSetActions";

interface WritingSetRow {
  id: string;
  title: string;
  week: number | null;
  is_hidden: boolean;
  created_at: string;
  writing_sentences: { count: number }[];
}

// 한 주차의 서술형 세트 업로드 + 목록.
export default async function WritingSection({
  courseId,
  week,
  totalWeeks,
}: {
  courseId: string;
  week: number | null;
  totalWeeks: number;
}) {
  if (week === null) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
        서술형은 주차를 정해서 등록합니다. 1~{totalWeeks}주차 화면에서 등록해주세요.
      </p>
    );
  }

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("writing_sets")
    .select("id, title, week, is_hidden, created_at, writing_sentences(count)")
    .eq("course_id", courseId)
    .eq("week", week)
    .order("created_at", { ascending: false })
    .returns<WritingSetRow[]>();

  const sets = rows ?? [];

  return (
    <div className="flex flex-col gap-4">
      <UploadWritingSetForm courseId={courseId} defaultWeek={week} totalWeeks={totalWeeks} />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          서술형 목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="w-20 px-4 py-3">문장 수</th>
              <th className="w-40 px-4 py-3">등록일</th>
              <th className="w-20 px-2 py-3 text-center">문장 보기</th>
              <th className="w-20 px-2 py-3 text-center">숨김</th>
              <th className="w-20 px-2 py-3 text-center">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sets.map((set) => (
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
                </td>
                <td className="px-4 py-3 text-zinc-700">{set.writing_sentences[0]?.count ?? 0}개</td>
                <td className="px-4 py-3 text-zinc-500">{formatDateTime(set.created_at)}</td>
                <td className="px-2 py-3 text-center">
                  <Link
                    href={`/mypage/teaching/${courseId}/writing/${set.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    문장 보기
                  </Link>
                </td>
                <td className="px-2 py-3 text-center">
                  <WritingSetHideButton setId={set.id} courseId={courseId} hidden={set.is_hidden} />
                </td>
                <td className="px-2 py-3 text-center">
                  <WritingSetDeleteButton setId={set.id} courseId={courseId} />
                </td>
              </tr>
            ))}
            {sets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  {error ? "목록을 불러오지 못했습니다." : "등록된 서술형 세트가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
