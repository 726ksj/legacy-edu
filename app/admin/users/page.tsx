import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, name, school, grade")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">회원 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        가입한 학생/학부모 회원 정보를 확인하는 페이지입니다. 자세한 정보,
        수정, 탈퇴 처리는 「자세히 보기」에서 할 수 있습니다.
      </p>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">학년</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.name}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.school ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">{row.grade ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    자세히 보기
                  </Link>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  가입한 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
