import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import InstructorForm from "./InstructorForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createAdminClient();
  const { data: instructors, error } = await supabase
    .from("instructors")
    .select("id, name, subject, photo_url, bio, profile_id, created_at")
    .order("created_at", { ascending: false });

  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, name, username")
    .eq("role", "teacher")
    .order("name", { ascending: true });

  const linkedProfileIds = new Set(
    (instructors ?? []).map((row) => row.profile_id).filter(Boolean),
  );
  const availableTeachers = (teachers ?? []).filter(
    (teacher) => !linkedProfileIds.has(teacher.id),
  );
  const teacherNameById = new Map(
    (teachers ?? []).map((teacher) => [teacher.id, teacher.name]),
  );
  // 카드에 연결 안 된 선생님 계정도 여기서 관리할 수 있어야 하니 따로
  // 목록에 보여준다(availableTeachers와 동일 목록, 이름만 다르게 씀).
  const unlinkedTeachers = availableTeachers;

  return (
    <div className="flex flex-1 flex-col p-8">
      <h1 className="text-2xl font-bold text-zinc-900">강사 관리</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        강좌 상세 화면에 노출되는 강사 프로필(사진/소개)을 등록/관리합니다.
        등록한 강사는 강좌 관리에서 선택해 연결할 수 있습니다. 선생님 로그인
        계정 관리(정보 수정/삭제)도 여기서 함께 합니다.
      </p>

      <div className="mt-6">
        <InstructorForm teachers={availableTeachers} />
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
              <th className="px-4 py-3">연결 계정</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {instructors?.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-zinc-100">
                    {row.photo_url && (
                      <Image
                        src={row.photo_url}
                        alt={row.name}
                        fill
                        sizes="40px"
                        className="object-cover"
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
                <td className="px-4 py-3 text-zinc-500">
                  {row.profile_id ? (
                    <Link
                      href={`/admin/teacher-accounts/${row.profile_id}`}
                      className="font-medium text-brand-dark hover:underline"
                    >
                      {teacherNameById.get(row.profile_id) ?? "계정 관리"}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/instructors/${row.id}`}
                    className="text-xs font-semibold text-brand-dark hover:underline"
                  >
                    자세히 보기
                  </Link>
                </td>
              </tr>
            ))}
            {instructors?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  등록된 강사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {unlinkedTeachers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-700">
            강사 카드에 연결되지 않은 선생님 계정
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            위 목록의 강사 카드와 아직 연결 안 된 선생님 계정입니다. 이름만
            눌러도 계정 관리 화면으로 이동합니다.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unlinkedTeachers.map((teacher) => (
              <li key={teacher.id}>
                <Link
                  href={`/admin/teacher-accounts/${teacher.id}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand hover:text-brand-dark"
                >
                  {teacher.name} ({teacher.username})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
