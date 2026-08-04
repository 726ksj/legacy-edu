import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import InstructorForm from "./InstructorForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: instructors, error } = await supabase
    .from("instructors")
    .select("id, name, subject, photo_url, bio, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">강사 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        강좌 상세 화면에 노출되는 강사 프로필(사진/소개)을 등록/관리합니다.
        등록한 강사는 강좌 관리에서 선택해 연결할 수 있습니다.
      </p>

      <div className="mt-6">
        <InstructorForm />
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
              <th className="px-4 py-3">사진</th>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">과목</th>
              <th className="px-4 py-3">소개</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {instructors?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-100">
                    {row.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.photo_url}
                        alt={row.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.name}
                </td>
                <td className="px-4 py-3 text-zinc-700">{row.subject}</td>
                <td className="max-w-xs truncate px-4 py-3 text-zinc-500">
                  {row.bio ?? "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/instructors/${row.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    수정
                  </Link>
                </td>
              </tr>
            ))}
            {instructors?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  등록된 강사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
