import { createAdminClient } from "@/lib/supabase/admin";
import StudentCodeForm from "./StudentCodeForm";
import DeleteCodeButton from "./DeleteCodeButton";
import { deleteStudentCode } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: codes, error } = await supabase
    .from("student_codes")
    .select("id, code, student_name, is_used, created_at, used_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <span className="mb-2 text-xs font-medium text-zinc-400">
        /admin/student-codes
      </span>
      <h1 className="text-2xl font-bold text-zinc-900">학생코드 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        회원가입에 사용되는 학생코드를 발급/관리하는 페이지입니다.
      </p>

      <div className="mt-6">
        <StudentCodeForm />
      </div>

      {error && (
        <p className="mt-6 text-sm font-medium text-red-500">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-4 py-3">코드</th>
              <th className="px-4 py-3">학생 이름</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">발급일</th>
              <th className="px-4 py-3">사용일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {codes?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-zinc-900">{row.code}</td>
                <td className="px-4 py-3 text-zinc-700">{row.student_name}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.is_used
                        ? "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500"
                        : "rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark"
                    }
                  >
                    {row.is_used ? "사용 완료" : "미사용"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.used_at
                    ? new Date(row.used_at).toLocaleString("ko-KR")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteCodeButton
                    action={deleteStudentCode.bind(null, row.id)}
                    isUsed={row.is_used}
                  />
                </td>
              </tr>
            ))}
            {codes?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  등록된 학생코드가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
