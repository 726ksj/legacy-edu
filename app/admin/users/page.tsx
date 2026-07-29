import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, username, name, phone, address, school, grade, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/users
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">회원 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        가입한 학생/학부모 회원 정보를 확인하는 페이지입니다.
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
              <th className="px-4 py-3">아이디</th>
              <th className="px-4 py-3">전화번호</th>
              <th className="px-4 py-3">주소</th>
              <th className="px-4 py-3">학교</th>
              <th className="px-4 py-3">학년</th>
              <th className="px-4 py-3">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.name}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-700">
                  {row.username}
                </td>
                <td className="px-4 py-3 text-zinc-500">{row.phone}</td>
                <td className="px-4 py-3 text-zinc-500">{row.address}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.school ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">{row.grade ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
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
