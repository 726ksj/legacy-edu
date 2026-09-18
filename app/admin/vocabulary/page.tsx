import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/formatDateTime";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, subject, title, teacher_name, school, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">단어장 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        강좌를 선택하면 그 강좌에 배정할 단어장을 업로드하고 관리할 수
        있습니다. 강좌 목록은 강좌 관리 화면의 데이터를 그대로 사용합니다.
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">강좌명</th>
              <th className="px-4 py-3">강사</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">개설일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {courses?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-zinc-700">{row.subject}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.title}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {row.teacher_name}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.school ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/vocabulary/${row.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    단어장 관리
                  </Link>
                </td>
              </tr>
            ))}
            {courses?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  등록된 강좌가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
